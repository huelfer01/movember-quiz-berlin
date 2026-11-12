import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { createApplication } from './application.ts';
import { readConfig } from './config.ts';
import { SqliteDatabase } from './database.ts';

const APP_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const config = readConfig(process.env, APP_ROOT);
await mkdir(dirname(config.databasePath), { recursive: true });
const database = new SqliteDatabase(config.databasePath);
const application = createApplication({
    publicDirectory: fileURLToPath(new URL('../../quiz/', import.meta.url)),
    database,
    checkDatabase: () => database.check(),
});
const server = createServer(async (incoming, outgoing) => {
    // The configured public origin survives TLS termination. Forwarded headers are
    // deliberately ignored; an arbitrary Host header cannot change production origin checks.
    const origin =
        config.publicOrigin ?? `http://${incoming.headers.host ?? '127.0.0.1:' + config.port}`;
    const method = incoming.method ?? 'GET';
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    const init: RequestInit & { duplex?: 'half' } = { method, headers };
    if (!['GET', 'HEAD'].includes(method)) {
        init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
        init.duplex = 'half';
    }
    try {
        const target = new URL(incoming.url ?? '/', origin);
        if (target.origin !== origin) {
            outgoing.writeHead(400, { 'Content-Type': 'application/json' });
            outgoing.end(JSON.stringify({ message: 'Invalid request target.' }));
            return;
        }
        const response = await application(new Request(target, init));
        outgoing.writeHead(response.status, Object.fromEntries(response.headers));
        outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
        console.error(JSON.stringify({ event: 'request_failed' }));
        if (!outgoing.headersSent)
            outgoing.writeHead(500, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
            });
        outgoing.end(JSON.stringify({ message: 'The service is temporarily unavailable.' }));
    }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('error', (error) => {
    console.error(
        JSON.stringify({ event: 'server_error', code: 'code' in error ? error.code : 'UNKNOWN' })
    );
    database.close();
    process.exitCode = 1;
});
let isStopping = false;
/** Drain requests before closing SQLite when a pod receives its termination signal. */
function stop(): void {
    if (isStopping) return;
    isStopping = true;
    const deadline = setTimeout(() => {
        server.closeAllConnections();
    }, 10000);
    deadline.unref();
    server.close(() => {
        clearTimeout(deadline);
        database.close();
    });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
server.listen(config.port, config.host, () =>
    console.log(JSON.stringify({ event: 'listening', host: config.host, port: config.port }))
);
