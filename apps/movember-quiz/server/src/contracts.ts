/** Database contract shared by the existing leaderboard handler and Node adapter. */
export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;
export interface QueryResult {
    results: SqlRow[];
}
export interface BoundStatement {
    bind(...values: SqlValue[]): BoundStatement;
    all(): Promise<QueryResult>;
    run(): Promise<unknown>;
}
export interface LeaderboardDatabase {
    prepare(sql: string): BoundStatement;
    batch(statements: BoundStatement[]): Promise<QueryResult[]>;
}
export interface WorkerEnvironment {
    LEADERBOARD_DB: LeaderboardDatabase;
    ASSETS: { fetch(request: Request): Promise<Response> };
}
