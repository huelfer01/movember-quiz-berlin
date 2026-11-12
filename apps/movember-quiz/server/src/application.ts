import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import handler from '../../quiz/_worker.js';
import type { LeaderboardDatabase } from './contracts.ts';

const publicFiles: Record<string, string> = {
    'index.html': 'text/html',
    'organizer.html': 'text/html',
    'styles.css': 'text/css',
    'app.js': 'text/javascript',
    'questions.js': 'text/javascript',
    'quiz-version.js': 'text/javascript',
    'leaderboard.js': 'text/javascript',
    'organizer.js': 'text/javascript',
    'vendor/qrcode.js': 'text/javascript',
    'vendor/QR-LICENSE.txt': 'text/plain',
    'assets/oliver-wyman.svg': 'image/svg+xml',
    'assets/nick-offerman.jpg': 'image/jpeg',
};
const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};
export interface ApplicationOptions {
    publicDirectory: string;
    database: LeaderboardDatabase;
    checkDatabase(): void;
}

/**
 * Serve only the explicit public asset list.
 * @param {Request} request Incoming same-origin request.
 * @param {string} directory Public quiz directory.
 * @returns {Promise<Response>} Asset response or a public-safe error.
 */
async function staticAsset(request: Request, directory: string): Promise<Response> {
    if (!['GET', 'HEAD'].includes(request.method))
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    const url = new URL(request.url);
    let name: string;
    try {
        name = decodeURIComponent(url.pathname.slice(1)) || 'index.html';
    } catch {
        return new Response('Invalid URL', { status: 400 });
    }
    const contentType = Object.hasOwn(publicFiles, name) ? publicFiles[name] : undefined;
    if (!contentType) return new Response('Not found', { status: 404 });
    let data: Buffer;
    try {
        data = await readFile(resolve(directory, name));
    } catch {
        return new Response('Not found', { status: 404 });
    }
    return new Response(request.method === 'HEAD' ? null : new Uint8Array(data), {
        headers: { 'Content-Type': contentType + '; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
}

/**
 * Create the same-origin quiz and leaderboard application.
 * @param {ApplicationOptions} options Storage, readiness check and static directory.
 * @returns {function(Request): Promise<Response>} Fetch-compatible request handler.
 */
export function createApplication(
    options: ApplicationOptions
): (request: Request) => Promise<Response> {
    return async (request) => {
        const path = new URL(request.url).pathname;
        let response: Response;
        if (path === '/healthz') {
            response = Response.json(
                { status: 'ok' },
                { headers: { 'Cache-Control': 'no-store' } }
            );
        } else if (path === '/readyz') {
            try {
                options.checkDatabase();
                response = Response.json(
                    { status: 'ready' },
                    { headers: { 'Cache-Control': 'no-store' } }
                );
            } catch {
                response = Response.json(
                    { status: 'unavailable' },
                    { status: 503, headers: { 'Cache-Control': 'no-store' } }
                );
            }
        } else {
            response = await handler.fetch(request, {
                LEADERBOARD_DB: options.database,
                ASSETS: { fetch: (incoming) => staticAsset(incoming, options.publicDirectory) },
            });
        }
        for (const [name, value] of Object.entries(securityHeaders))
            response.headers.set(name, value);
        return response;
    };
}
