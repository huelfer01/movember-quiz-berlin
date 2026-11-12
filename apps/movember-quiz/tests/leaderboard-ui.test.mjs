// Test interaction logic without launching a browser; not a visual-layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import worker from '../quiz/_worker.js';
import { LocalDatabase } from '../server/local-db.mjs';
class Element {
  hidden = false; disabled = false; value = ''; textContent = ''; innerHTML = '';
  reportValidity() { return false; }
}
class Root {
  nodes = new Map(); html = '';
  set innerHTML(html) {
    this.html = html;
    for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
      const node = new Element(); node.hidden = /\bhidden\b/.test(match[0]); this.nodes.set('#' + match[1], node);
    }
  }
  querySelector(selector) { assert.ok(this.nodes.has(selector), selector); return this.nodes.get(selector); }
}
async function setup(t, { protocol = 'https:', dropPost = false, failDelete = false } = {}) {
  const db = new LocalDatabase(); db.sqlite.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8')); t.after(() => db.close());
  const env = { LEADERBOARD_DB: db };
  const requests = [];
  const context = { window: {}, location: { protocol }, crypto, Uint8Array, AbortController, console, setTimeout, clearTimeout,
    fetch: async (url, options) => {
      requests.push(options);
      if (options.method === 'DELETE' && failDelete) throw new TypeError('Offline');
      const response = await worker.fetch(new Request('https://office.test' + url, options), env);
      if (options.method === 'POST' && dropPost) throw new TypeError('Response lost');
      return response;
    }
  };
  vm.createContext(context);
  for (const f of ['questions.js', 'quiz-version.js', 'leaderboard.js']) vm.runInContext(readFileSync(new URL('../quiz/' + f, import.meta.url), 'utf8'), context);
  const answers = Array.from(context.window.QUIZ_QUESTIONS, q => q.answer);
  const root = new Root(); const dispose = context.window.mountLeaderboard(root, answers); t.after(dispose);
  const el = id => root.querySelector('#leaderboard-' + id);
  async function idle() { for (let i = 0; el('submit').disabled && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 2)); assert.equal(el('submit').disabled, false); }
  await idle();
  return { db, root, el, requests, idle, context };
}
test('viewing and choosing private never submits a name or answers', async t => {
  const { el, requests, db } = await setup(t);
  assert.equal(el('form').hidden, false); assert.equal(requests.length, 1); assert.equal(requests[0].method, 'GET'); assert.equal(requests[0].body, undefined);
  el('name').value = 'Alex'; await el('skip').onclick();
  assert.equal(el('form').hidden, true); assert.equal(el('name').value, ''); assert.equal(requests.length, 1);
  await el('refresh').onclick(); assert.equal(el('form').hidden, true); assert.ok(requests.every(r => r.method === 'GET'));
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 0);
});
test('explicit sharing shows rank, highlights the player and allows withdrawal', async t => {
  const { el, requests } = await setup(t); el('name').value = 'Alex';
  await el('form').onsubmit({ preventDefault() {} });
  assert.equal(requests.filter(r => r.method === 'POST').length, 1);
  assert.equal(el('form').hidden, true); assert.equal(el('rank').hidden, false); assert.match(el('rank').textContent, /#1 of 1 shared result/);
  assert.match(el('entries').innerHTML, /your-entry/); assert.equal(el('remove').hidden, false);
  await el('remove').onclick(); assert.match(el('status').textContent, /removed/); assert.equal(el('rank').hidden, true); assert.equal(el('remove').hidden, true);
});
test('a lost submission response cannot produce a false promise of privacy', async t => {
  const { el, db, requests } = await setup(t, { dropPost: true }); el('name').value = 'Alex';
  await el('form').onsubmit({ preventDefault() {} });
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 1); assert.match(el('status').textContent, /saved/);
  await el('skip').onclick();
  assert.equal(requests.at(-1).method, 'DELETE'); assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 0); assert.match(el('status').textContent, /private again/);
});
test('a failed withdrawal keeps the entry and reports uncertainty', async t => {
  const { el, db } = await setup(t, { failDelete: true }); el('name').value = 'Alex'; await el('form').onsubmit({ preventDefault() {} });
  await el('remove').onclick(); assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 1); assert.match(el('status').textContent, /Could not confirm removal/); assert.equal(el('remove').hidden, false);
});
test('opening the HTML file locally does not send anything or offer a fake shared list', async t => {
  const { el, requests } = await setup(t, { protocol: 'file:' }); assert.equal(requests.length, 0); assert.equal(el('form').hidden, true); assert.match(el('status').textContent, /published/);
});
test('names from the database are escaped when rendered', async t => {
  const { db, el, context } = await setup(t);
  db.sqlite.prepare('INSERT INTO scores (id, quiz_id, first_name, score, token_hash) VALUES (?, ?, ?, ?, ?)')
    .run('test', context.window.QUIZ_VERSION, '<img src=x onerror=alert(1)>', 10, 'testhash');
  await el('refresh').onclick(); assert.ok(el('entries').innerHTML.includes('&lt;img')); assert.ok(!el('entries').innerHTML.includes('<img'));
});
