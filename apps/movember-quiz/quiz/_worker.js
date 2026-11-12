// Source template. Run `npm run build` after editing questions or this file.
// It generates the standalone quiz/_worker.js supported by Pages Direct Upload.
const QUIZ = {"id":"40966ac2f064b51bdf0b","answerKey":[1,3,0,2,2,1,2,1,2,0],"optionCounts":[4,4,4,4,4,4,4,4,4,4]};
const TOKEN = /^[a-f0-9]{64}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'X-Entry-Token'
    }
  });
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

async function bodyJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('Use a JSON request.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new Error('Request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error('Invalid JSON.'); }
}

async function leaderboard(db, hash = '') {
  // Competition ranking: 1, 1, 3. Submission time only stabilizes display order.
  const ranked = `SELECT id, first_name AS name, score,
    RANK() OVER (ORDER BY score DESC) AS rank, created_at, token_hash
    FROM scores WHERE quiz_id = ?`;
  const [top, count, own] = await db.batch([
    db.prepare(`SELECT id, name, score, rank FROM (${ranked})
      ORDER BY score DESC, created_at, id LIMIT 50`).bind(QUIZ.id),
    db.prepare('SELECT COUNT(*) AS total FROM scores WHERE quiz_id = ?').bind(QUIZ.id),
    db.prepare(`SELECT id, name, score, rank FROM (${ranked}) WHERE token_hash = ?`).bind(QUIZ.id, hash)
  ]);
  return { entries: top.results, total: count.results[0].total, me: own.results[0] || null,
    questionCount: QUIZ.answerKey.length, quizId: QUIZ.id };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (url.pathname !== '/api/leaderboard') return json({ message: 'Not found.' }, 404);
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
      return json({ message: 'Method not allowed.' }, 405);
    }
    const origin = request.headers.get('origin');
    if ((origin && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return json({ message: 'Use the quiz website to access the leaderboard.' }, 403);
    }
    if (!env.LEADERBOARD_DB) return json({ message: 'The office leaderboard is not available yet.' }, 503);
    try {
      const headerToken = request.headers.get('x-entry-token');
      if (headerToken && !TOKEN.test(headerToken)) return json({ message: 'Invalid entry receipt.' }, 400);
      if (request.method === 'GET') {
        return json(await leaderboard(env.LEADERBOARD_DB, headerToken ? await tokenHash(headerToken) : ''));
      }
      if (request.method === 'DELETE') {
        if (!headerToken) return json({ message: 'Your entry receipt is required.' }, 400);
        const hash = await tokenHash(headerToken);
        // Atomic cancellation also covers a POST still in flight on a weak connection.
        await env.LEADERBOARD_DB.batch([
          env.LEADERBOARD_DB.prepare('INSERT OR IGNORE INTO withdrawn_receipts (token_hash) VALUES (?)').bind(hash),
          env.LEADERBOARD_DB.prepare('DELETE FROM scores WHERE quiz_id = ? AND token_hash = ?').bind(QUIZ.id, hash)
        ]);
        return json(await leaderboard(env.LEADERBOARD_DB));
      }
      let body;
      try { body = await bodyJson(request); }
      catch (error) { return json({ message: error.message }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ message: 'Invalid submission.' }, 400);
      if (body.quizId !== QUIZ.id) return json({ message: 'The quiz has changed. Reload the page and play the current version.' }, 409);
      if (typeof body.name !== 'string') return json({ message: 'Enter a first name or nickname.' }, 400);
      const name = body.name.normalize('NFC').trim().replace(/ +/g, ' ');
      if (!name || Array.from(name).length > 30 || !/^[\p{L}\p{M}\p{N} .’'-]+$/u.test(name)) {
        return json({ message: 'Use 1–30 letters, numbers, spaces, apostrophes, dots or hyphens.' }, 400);
      }
      if (typeof body.token !== 'string' || !TOKEN.test(body.token)) return json({ message: 'Invalid entry receipt.' }, 400);
      if (!Array.isArray(body.answers) || body.answers.length !== QUIZ.answerKey.length ||
          body.answers.some((value, i) => !Number.isInteger(value) || value < 0 || value >= QUIZ.optionCounts[i])) {
        return json({ message: 'Finish all ten questions before sharing your score.' }, 400);
      }
      // Ignore any score supplied by the browser. Do not persist individual answers.
      const score = body.answers.filter((value, i) => value === QUIZ.answerKey[i]).length;
      const hash = await tokenHash(body.token);
      // An unchanged receipt makes retries safe, including a lost POST response.
      await env.LEADERBOARD_DB.prepare(`INSERT INTO scores (id, quiz_id, first_name, score, token_hash)
        SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS
        (SELECT 1 FROM withdrawn_receipts WHERE token_hash = ?)
        ON CONFLICT(token_hash) DO NOTHING`)
        .bind(crypto.randomUUID(), QUIZ.id, name, score, hash, hash).run();
      const data = await leaderboard(env.LEADERBOARD_DB, hash);
      if (!data.me) return json({ message: 'This sharing attempt was cancelled. Reload the page before trying again.' }, 409);
      return json(data);
    } catch {
      // Do not log names, answers or private deletion receipts.
      return json({ message: 'The leaderboard is temporarily unavailable. Please try again.' }, 503);
    }
  }
};
