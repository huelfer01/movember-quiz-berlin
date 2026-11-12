// Local preview with a real shared SQLite store. Requires Node.js 24+.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../quiz/_worker.js';
import { LocalDatabase } from '../server/local-db.mjs';
const project = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(project, 'quiz');
await mkdir(resolve(project, '.data'), { recursive: true });
const db = new LocalDatabase(resolve(project, '.data/leaderboard.sqlite'));
db.sqlite.exec(await readFile(resolve(project, 'server/schema.sql'), 'utf8'));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json', '.txt':'text/plain' };
const env = {
  LEADERBOARD_DB: db,
  ASSETS: { async fetch(request) {
    const url = new URL(request.url);
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Bad URL', { status: 400 }); }
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
    try { return new Response(await readFile(file), { headers: { 'Content-Type': (types[extname(file)] || 'application/octet-stream') + '; charset=utf-8' } }); }
    catch { return new Response('Not found', { status: 404 }); }
  } }
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const options = { method: incoming.method, headers: incoming.headers };
    if (!['GET', 'HEAD'].includes(incoming.method)) { options.body = Readable.toWeb(incoming); options.duplex = 'half'; }
    const request = new Request('http://127.0.0.1:8765' + incoming.url, options);
    const response = await worker.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500); outgoing.end('Local server error.'); }
});
server.listen(8765, '127.0.0.1', () => console.log('Quiz + local leaderboard: http://127.0.0.1:8765'));
