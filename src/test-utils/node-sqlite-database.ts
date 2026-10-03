import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

type Param = string | number | null;
type Params = Param[] | Record<string, Param>;

/** Accepts expo-sqlite's call styles: (sql, a, b), (sql, [a, b]) or (sql, { $a: 1 }). */
function normalize(args: unknown[]): Params {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
    return args[0] as Params;
  }
  return args as Param[];
}

function run<T>(db: DatabaseSync, sql: string, params: Params, fn: 'run' | 'all' | 'get'): T {
  const statement = db.prepare(sql);
  return (Array.isArray(params) ? statement[fn](...params) : statement[fn](params)) as T;
}

/**
 * A real, in-memory SQLite database (Node's built-in `node:sqlite`) exposing the subset
 * of expo-sqlite's async API this app uses, so migrations and repositories can be
 * tested against real SQL. Test-only; requires Node 22.13+.
 */
export function createTestDatabase(): SQLiteDatabase {
  const db = new DatabaseSync(':memory:');

  const adapter = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, ...args: unknown[]) {
      const result = run<{ changes: number | bigint; lastInsertRowid: number | bigint }>(
        db,
        sql,
        normalize(args),
        'run',
      );
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, ...args: unknown[]) {
      return run<T[]>(db, sql, normalize(args), 'all').map((row) => ({ ...row }));
    },
    async getFirstAsync<T>(sql: string, ...args: unknown[]) {
      const row = run<T | undefined>(db, sql, normalize(args), 'get');
      return row ? { ...row } : null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async prepareAsync(sql: string) {
      const statement = db.prepare(sql);
      return {
        async executeAsync(params: Record<string, Param>) {
          statement.run(params);
        },
        async finalizeAsync() {},
      };
    },
    closeSync() {
      db.close();
    },
  };

  return adapter as unknown as SQLiteDatabase;
}
