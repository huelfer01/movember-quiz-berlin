import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { SqliteDatabase } from './database.ts';

describe('SqliteDatabase', () => {
    let database: SqliteDatabase;
    beforeEach(() => {
        database = new SqliteDatabase(':memory:');
    });
    afterEach(() => {
        database.close();
    });
    it('should create the leaderboard schema when opened', async () => {
        const rows = await database.prepare('SELECT COUNT(*) AS total FROM scores').all();
        expect(rows.results).toEqual([{ total: 0 }]);
    });
    it('should keep user strings as values when executing parameterized writes', async () => {
        await database
            .prepare('INSERT INTO withdrawn_receipts VALUES (?)')
            .bind("quote' OR 1=1")
            .run();
        const rows = await database.prepare('SELECT token_hash FROM withdrawn_receipts').all();
        expect(rows.results).toEqual([{ token_hash: "quote' OR 1=1" }]);
    });
    it('should roll back every write when a batch contains a failing statement', async () => {
        const insert = database
            .prepare('INSERT INTO withdrawn_receipts VALUES (?)')
            .bind('duplicate');
        await expect(database.batch([insert, insert])).rejects.toThrow('Database batch failed');
        expect(
            (await database.prepare('SELECT COUNT(*) AS total FROM withdrawn_receipts').all())
                .results
        ).toEqual([{ total: 0 }]);
    });
    it('should avoid interleaving open transactions when batches start together', async () => {
        await Promise.all(
            ['first', 'second'].map((token) =>
                database.batch([
                    database.prepare('INSERT INTO withdrawn_receipts VALUES (?)').bind(token),
                ])
            )
        );
        expect(
            (await database.prepare('SELECT COUNT(*) AS total FROM withdrawn_receipts').all())
                .results
        ).toEqual([{ total: 2 }]);
    });
    it('should reject foreign statements when batching', async () => {
        const foreign = {
            bind: () => foreign,
            all: async () => ({ results: [] }),
            run: async () => undefined,
        };
        await expect(database.batch([foreign])).rejects.toThrow('Unsupported database statement');
    });
    it('should report database readiness when open', () => {
        expect(() => database.check()).not.toThrow();
    });
});
