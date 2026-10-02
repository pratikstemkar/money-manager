import type { SqlTransport } from "../transport";

const DB_URL = "sqlite:money-manager.db";
const DB_NAME = "money-manager.db";

type PluginDatabase = {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
  select: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  close: () => Promise<boolean>;
};

let databasePromise: Promise<PluginDatabase> | null = null;

function loadDatabase(): Promise<PluginDatabase> {
  if (!databasePromise) {
    databasePromise = import("@tauri-apps/plugin-sql").then(
      ({ default: Database }) => Database.load(DB_URL) as Promise<PluginDatabase>,
    );
  }
  return databasePromise;
}

/**
 * Desktop transport backed by the Tauri SQL plugin. The database file lives in
 * the OS app-data directory (resolved by Tauri from the relative path).
 */
export function createTauriTransport(): SqlTransport {
  return async (sql, params, method) => {
    const database = await loadDatabase();

    if (method === "run") {
      const result = (await database.execute(sql, params)) as {
        rowsAffected?: number;
        lastInsertId?: number;
      };
      return {
        rows: [],
        changes: result?.rowsAffected,
        lastInsertRowid: result?.lastInsertId,
      };
    }

    const rows = await database.select(sql, params);
    // Drizzle's proxy expects arrays in selected-column order. The plugin
    // returns row objects; JSON key order matches the SELECT order.
    const arrays = rows.map((row) => Object.values(row));

    return { rows: method === "get" ? arrays.slice(0, 1) : arrays };
  };
}

export const TAURI_DB_FILE_NAME = DB_NAME;
