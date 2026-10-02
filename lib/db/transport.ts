/**
 * A transport executes SQL against a SQLite database on behalf of Drizzle's
 * `sqlite-proxy` driver. Platform differences are isolated behind this type:
 * the browser uses a local dev HTTP server, while the desktop build uses the
 * Tauri SQL plugin.
 */
export type SqlMethod = "run" | "all" | "get" | "values";

export interface SqlResult {
  /** Rows as arrays of column values, in the order selected. */
  rows: unknown[][];
  changes?: number;
  lastInsertRowid?: number;
}

export interface SqlTransport {
  (sql: string, params: unknown[], method: SqlMethod): Promise<SqlResult>;
}
