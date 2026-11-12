import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import worker from '../quiz/_worker.js';
import { LocalDatabase } from '../server/local-db.mjs';
const context = { window: {} };
vm.runInNewContext(readFileSync(new URL('../quiz/questions.js', import.meta.url), 'utf8'), context);
vm.runInNewContext(readFileSync(new URL('../quiz/quiz-version.js', import.meta.url), 'utf8'), context);
const correct = Array.from(context.window.QUIZ_QUESTIONS, q => q.answer);
const quizId = context.window.QUIZ_VERSION;
const token = () => crypto.getRandomValues(new Uint8Array(32)).reduce((s, n) => s + n.toString(16).padStart(2, '0'), '');
function setup(t) {
  const db = new LocalDatabase();
  db.sqlite.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  t.after(() => db.close());
  const env = { LEADERBOARD_DB: db, ASSETS: { fetch: async () => new Response('static quiz') } };
  async function call(method = 'GET', body, receipt, extras = {}) {
    const headers = { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(receipt ? { 'X-Entry-Token': receipt } : {}), ...extras };
    const response = await worker.fetch(new Request('https://office.test/api/leaderboard', { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    return { status: response.status, data: await response.json(), headers: response.headers };
  }
  const submit = (name = 'Alex', answers = correct, receipt = token()) => call('POST', { name, answers, token: receipt, quizId });
  return { db, env, call, submit };
}
test('viewing the leaderboard never creates a score; responses are not cached', async t => {
  const { call, db } = setup(t); const res = await call();
  assert.equal(res.status, 200); assert.deepEqual(res.data.entries, []); assert.equal(res.data.total, 0); assert.equal(res.data.me, null);
  assert.equal(res.headers.get('Cache-Control'), 'no-store'); assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 0);
});
test('server calculates score, ignores a forged score and stores no individual answers', async t => {
  const { call, db } = setup(t); const receipt = token(); const answers = correct.map((v, i) => i < 3 ? (v + 1) % 4 : v);
  const res = await call('POST', { name: '  Éloïse  ', answers, score: 999, token: receipt, quizId });
  assert.equal(res.status, 200); assert.equal(res.data.me.score, 7); assert.equal(res.data.me.name, 'Éloïse'); assert.equal(res.data.me.rank, 1);
  const row = db.sqlite.prepare('SELECT * FROM scores').get(); assert.equal(row.score, 7); assert.notEqual(row.token_hash, receipt); assert.ok(!('answers' in row));
  assert.ok(!JSON.stringify(res.data).includes(receipt)); assert.ok(!JSON.stringify(res.data).includes(row.token_hash));
});
test('equal scores share rank, duplicate first names remain separate people, retries do not duplicate', async t => {
  const { submit, call } = setup(t); const receipt = token();
  await submit('Alex', correct, receipt); await submit('Alex');
  await submit('Sam', correct.map((v, i) => i === 0 ? (v + 1) % 4 : v));
  await submit('Alex', correct, receipt);
  const { data } = await call(); assert.equal(data.total, 3); assert.deepEqual(data.entries.map(e => e.rank), [1, 1, 3]);
  assert.deepEqual(data.entries.map(e => e.score), [10, 10, 9]);
});
test('zero scores can be shared', async t => {
  const { submit } = setup(t); const res = await submit('Mo', correct.map(v => (v + 1) % 4)); assert.equal(res.data.me.score, 0);
});
test('rank outside the top 50 is returned for the player', async t => {
  const { submit, db, call } = setup(t);
  const insert = db.sqlite.prepare('INSERT INTO scores (id, quiz_id, first_name, score, token_hash) VALUES (?, ?, ?, ?, ?)');
  for (let i = 0; i < 55; i++) insert.run(String(i), quizId, 'High scorer', 10, 'seed-' + i);
  const receipt = token(); const res = await submit('Low scorer', correct.map(v => (v + 1) % 4), receipt);
  assert.equal(res.data.entries.length, 50); assert.equal(res.data.total, 56); assert.equal(res.data.me.rank, 56);
  const refreshed = await call('GET', undefined, receipt); assert.equal(refreshed.data.me.rank, 56);
});
test('only the holder of an entry receipt can remove it; deletion is idempotent and recalculates ranks', async t => {
  const { call, submit } = setup(t); const receipt = token();
  await submit('Alex', correct, receipt); await submit('Sam', correct.map(v => (v + 1) % 4));
  assert.equal((await call('DELETE')).status, 400);
  assert.equal((await call('DELETE', undefined, token())).data.total, 2);
  const res = await call('DELETE', undefined, receipt); assert.equal(res.data.total, 1); assert.equal(res.data.entries[0].name, 'Sam'); assert.equal(res.data.entries[0].rank, 1);
  assert.equal((await call('DELETE', undefined, receipt)).data.total, 1);
});
test('invalid names, tokens, answer arrays and stale quiz versions are rejected without writes', async t => {
  const { call, db } = setup(t); const base = { name: 'Alex', token: token(), quizId, answers: correct };
  for (const change of [{ name: '' }, { name: 'x'.repeat(31) }, { name: '<script>x</script>' }, { name: 'Alex\nSam' }, { token: 'invalid' }, { token: 123 }, { answers: [] }, { answers: [...correct.slice(1), 4] }, { answers: correct.map(() => null) }, { answers: correct.map(() => '1') }]) {
    assert.equal((await call('POST', { ...base, ...change })).status, 400, JSON.stringify(change));
  }
  assert.equal((await call('POST', { ...base, quizId: 'old' })).status, 409);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM scores').get().n, 0);
});
test('cross-origin writes are rejected', async t => {
  const { call } = setup(t);
  assert.equal((await call('POST', {}, undefined, { Origin: 'https://other.test' })).status, 403);
});
test('missing database does not break static pages, and API returns an honest unavailable response', async () => {
  const env = { ASSETS: { fetch: async () => new Response('static quiz') } };
  assert.equal(await (await worker.fetch(new Request('https://office.test/'), env)).text(), 'static quiz');
  assert.equal((await worker.fetch(new Request('https://office.test/api/leaderboard'), env)).status, 503);
});
test('database errors, malformed JSON, oversized requests and unsupported methods are handled', async t => {
  const { env, call } = setup(t);
  assert.equal((await call('PATCH')).status, 405);
  for (const text of ['{', 'x'.repeat(5000)]) {
    const res = await worker.fetch(new Request('https://office.test/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text }), env); assert.equal(res.status, 400);
  }
  const res = await worker.fetch(new Request('https://office.test/api/leaderboard'), { LEADERBOARD_DB: { batch: async () => { throw new Error('database detail'); } } });
  assert.equal(res.status, 503); assert.ok(!(await res.text()).includes('database detail'));
});
test('a delayed submission cannot reappear after the player cancels sharing', async t => {
  const { submit, call } = setup(t); const receipt = token();
  assert.equal((await call('DELETE', undefined, receipt)).status, 200);
  assert.equal((await submit('Alex', correct, receipt)).status, 409);
  assert.equal((await call()).data.total, 0);
});
