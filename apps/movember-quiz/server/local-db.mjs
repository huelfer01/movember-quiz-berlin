// Tiny D1-compatible adapter for local development and tests. Never deployed.
import { DatabaseSync } from 'node:sqlite';
export class LocalDatabase {
  constructor(filename = ':memory:') { this.sqlite = new DatabaseSync(filename); }
  prepare(sql) {
    const statement = this.sqlite.prepare(sql);
    const wrap = values => ({
      bind: (...args) => wrap(args),
      all: async () => ({ results: statement.all(...values).map(row => ({ ...row })) }),
      run: async () => ({ meta: statement.run(...values) })
    });
    return wrap([]);
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.all());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
  close() { this.sqlite.close(); }
}
