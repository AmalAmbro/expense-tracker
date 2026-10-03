// Minimal types for Node's built-in `node:sqlite`, used only by the test database adapter.
// Declared locally so the app doesn't pull in @types/node globals.
declare module 'node:sqlite' {
  type SQLInputValue = string | number | bigint | null;

  interface StatementSync {
    run(...params: SQLInputValue[] | [Record<string, SQLInputValue>]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
    all(...params: SQLInputValue[] | [Record<string, SQLInputValue>]): unknown[];
    get(...params: SQLInputValue[] | [Record<string, SQLInputValue>]): unknown;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
