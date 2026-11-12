import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import type { BoundStatement, LeaderboardDatabase, QueryResult, SqlValue } from './contracts.ts';

/** Keep the handler's database interface while running on Node's built-in SQLite. */
class SqliteStatement implements BoundStatement {
    private readonly statement: ReturnType<DatabaseSync['prepare']>;
    private readonly values: SqlValue[];

    /**
     * Wrap a prepared SQLite statement.
     * @param {object} statement Prepared statement.
     * @param {SqlValue[]} values Bound values.
     */
    constructor(statement: ReturnType<DatabaseSync['prepare']>, values: SqlValue[] = []) {
        this.statement = statement;
        this.values = values;
    }

    /**
     * Bind without overwriting another request's values.
     * @param {SqlValue[]} values SQL parameters.
     * @returns {SqliteStatement} Independently bound statement.
     */
    bind(...values: SqlValue[]): SqliteStatement {
        return new SqliteStatement(this.statement, values);
    }

    /**
     * Keep a batch transaction within one event-loop turn.
     * @returns {QueryResult} Selected rows.
     */
    executeAll(): QueryResult {
        return {
            results: this.statement.all(...this.values).map((row) => ({ ...row })),
        } as QueryResult;
    }

    /**
     * Match the existing async database contract.
     * @returns {Promise<QueryResult>} Selected rows.
     */
    async all(): Promise<QueryResult> {
        return this.executeAll();
    }

    /**
     * Execute a parameterized write.
     * @returns {Promise<unknown>} SQLite write metadata.
     */
    async run(): Promise<unknown> {
        return this.statement.run(...this.values);
    }
}

/** Single-instance persistent store. A production database lives on the mounted data volume. */
export class SqliteDatabase implements LeaderboardDatabase {
    private readonly database: DatabaseSync;

    /**
     * Open a SQLite file and initialize its schema.
     * @param {string} filename Absolute database path, or :memory: in tests.
     */
    constructor(filename: string) {
        this.database = new DatabaseSync(filename);
        this.database.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
        this.database.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
    }

    /**
     * Prepare SQL without interpolating user input.
     * @param {string} sql Parameterized SQL.
     * @returns {BoundStatement} Bindable statement.
     */
    prepare(sql: string): BoundStatement {
        return new SqliteStatement(this.database.prepare(sql));
    }

    /**
     * Execute atomically, with no await inside the transaction.
     * @param {BoundStatement[]} statements Read or write statements.
     * @returns {Promise<QueryResult[]>} Selected rows for each statement.
     */
    async batch(statements: BoundStatement[]): Promise<QueryResult[]> {
        const localStatements = statements.map((statement) => {
            if (!(statement instanceof SqliteStatement))
                throw new Error('Unsupported database statement.');
            return statement;
        });
        this.database.exec('BEGIN');
        let results: QueryResult[];
        try {
            results = localStatements.map((statement) => statement.executeAll());
        } catch (cause) {
            this.database.exec('ROLLBACK');
            throw new Error('Database batch failed.', { cause });
        }
        this.database.exec('COMMIT');
        return results;
    }

    /** Check database availability for readiness probes. */
    check(): void {
        this.database.prepare('SELECT 1').get();
    }

    /** Release the file on graceful shutdown. */
    close(): void {
        this.database.close();
    }
}
