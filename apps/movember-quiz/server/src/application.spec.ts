import { describe, expect, it, jest } from '@jest/globals';

import { createApplication } from './application.ts';
import type { LeaderboardDatabase } from './contracts.ts';

const database: LeaderboardDatabase = {
    prepare: () => {
        throw new Error('Unexpected database write');
    },
    batch: async () => [],
};

describe('createApplication', () => {
    it('should serve liveness when no database query is needed', async () => {
        const checkDatabase = jest.fn();
        const app = createApplication({ publicDirectory: '.', database, checkDatabase });
        const response = await app(new Request('https://quiz.example.com/healthz'));
        expect(await response.json()).toEqual({ status: 'ok' });
        expect(checkDatabase).not.toHaveBeenCalled();
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
    it('should report readiness when the database responds', async () => {
        const app = createApplication({
            publicDirectory: '.',
            database,
            checkDatabase: () => undefined,
        });
        expect((await app(new Request('https://quiz.example.com/readyz'))).status).toBe(200);
    });
    it('should report unavailable when the database readiness check fails', async () => {
        const app = createApplication({
            publicDirectory: '.',
            database,
            checkDatabase: () => {
                throw new Error('Private path');
            },
        });
        const response = await app(new Request('https://quiz.example.com/readyz'));
        expect(response.status).toBe(503);
        expect(await response.text()).not.toContain('Private path');
    });
    it.each([
        '/_worker.js',
        '/server/schema.sql',
        '/.data/leaderboard.sqlite',
        '/01%20Input/MovemberTemplate.pptx',
        '/%2e%2e%2fpackage.json',
        '/package.json',
    ])('should hide private file %s', async (path) => {
        const app = createApplication({
            publicDirectory: '.',
            database,
            checkDatabase: () => undefined,
        });
        expect((await app(new Request('https://quiz.example.com' + path))).status).toBe(404);
    });
    it('should reject malformed URL encoding when serving assets', async () => {
        const app = createApplication({
            publicDirectory: '.',
            database,
            checkDatabase: () => undefined,
        });
        expect((await app(new Request('https://quiz.example.com/%ZZ'))).status).toBe(400);
    });
    it('should reject writes when targeting a static asset', async () => {
        const app = createApplication({
            publicDirectory: '.',
            database,
            checkDatabase: () => undefined,
        });
        expect(
            (await app(new Request('https://quiz.example.com/index.html', { method: 'POST' })))
                .status
        ).toBe(405);
    });
    it('should return not found when a whitelisted asset is missing', async () => {
        const app = createApplication({
            publicDirectory: '/no-such-quiz-directory',
            database,
            checkDatabase: () => undefined,
        });
        expect((await app(new Request('https://quiz.example.com/index.html'))).status).toBe(404);
    });
});
