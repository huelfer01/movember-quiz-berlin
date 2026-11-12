import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { afterEach, beforeEach, expect, it } from '@jest/globals';

import { createApplication } from '../../server/src/application.ts';
import { SqliteDatabase } from '../../server/src/database.ts';

const ASSETS = fileURLToPath(new URL('../../quiz/', import.meta.url));
const ORIGIN = 'https://quiz.example.com';
const RECEIPT = 'ab'.repeat(32);

let directory: string;
let database: SqliteDatabase;
let app: ReturnType<typeof createApplication>;
beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'movember-node-'));
    database = new SqliteDatabase(join(directory, 'scores.sqlite'));
    app = createApplication({
        publicDirectory: ASSETS,
        database,
        checkDatabase: () => database.check(),
    });
});
afterEach(async () => {
    database.close();
    await rm(directory, { recursive: true, force: true });
});
it('should serve the quiz and its image assets when the app is deployed', async () => {
    const home = await app(new Request(ORIGIN));
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('THE MO YOU KNOW');
    const logo = await app(new Request(ORIGIN + '/assets/oliver-wyman.svg'));
    expect(logo.status).toBe(200);
    expect(logo.headers.get('Content-Type')).toContain('image/svg+xml');
    const portrait = await app(new Request(ORIGIN + '/assets/nick-offerman.jpg'));
    expect(portrait.status).toBe(200);
    expect(portrait.headers.get('Content-Type')).toContain('image/jpeg');
    const head = await app(new Request(ORIGIN, { method: 'HEAD' }));
    expect(await head.text()).toBe('');
});
it('should preserve shared scores across application restarts and honor withdrawals', async () => {
    const context = { window: {} as Record<string, unknown> };
    vm.createContext(context);
    vm.runInContext(await readFile(join(ASSETS, 'questions.js'), 'utf8'), context);
    vm.runInContext(await readFile(join(ASSETS, 'quiz-version.js'), 'utf8'), context);
    const questions = context.window.QUIZ_QUESTIONS as { answer: number }[];
    const response = await app(
        new Request(ORIGIN + '/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
            body: JSON.stringify({
                name: 'Alex',
                answers: questions.map((q) => q.answer),
                token: RECEIPT,
                quizId: context.window.QUIZ_VERSION,
            }),
        })
    );
    expect(response.status).toBe(200);
    database.close();
    database = new SqliteDatabase(join(directory, 'scores.sqlite'));
    app = createApplication({
        publicDirectory: ASSETS,
        database,
        checkDatabase: () => database.check(),
    });
    const scores = (await (await app(new Request(ORIGIN + '/api/leaderboard'))).json()) as {
        total: number;
        entries: { name: string; score: number }[];
    };
    expect(scores.total).toBe(1);
    expect(scores.entries[0]).toMatchObject({ name: 'Alex', score: 10 });
    const deleted = await app(
        new Request(ORIGIN + '/api/leaderboard', {
            method: 'DELETE',
            headers: { 'X-Entry-Token': RECEIPT, Origin: ORIGIN },
        })
    );
    expect(((await deleted.json()) as { total: number }).total).toBe(0);
});
