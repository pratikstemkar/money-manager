import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { createBrowserTransport } from "./transports/browser";
import { createHttpDevTransport } from "./transports/http-dev";
import { createTauriTransport } from "./transports/tauri";
import type { SqlTransport } from "./transport";
import * as schema from "./schema";

let database: SqliteRemoteDatabase<typeof schema> | null = null;

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
  );
}

/**
 * Chooses where SQL is executed:
 * - inside Tauri -> the Tauri SQL plugin (on-disk database)
 * - `NEXT_PUBLIC_DB_DRIVER=browser`, or any production build -> SQLite in the
 *   browser via sql.js + IndexedDB (works on static hosts like GitHub Pages)
 * - otherwise (local development) -> the local SQLite server
 */
function resolveTransport(): SqlTransport {
  if (isTauriRuntime()) return createTauriTransport();

  const driver = process.env.NEXT_PUBLIC_DB_DRIVER;
  if (driver === "browser") return createBrowserTransport();
  if (driver === "http") return createHttpDevTransport();

  return process.env.NODE_ENV === "production"
    ? createBrowserTransport()
    : createHttpDevTransport();
}

/**
 * Returns the shared Drizzle client. The transport is chosen once, based on
 * the runtime: Tauri SQL plugin on the desktop, local HTTP server in the
 * browser. All callers use the same typed query API.
 */
export function getDb(): SqliteRemoteDatabase<typeof schema> {
  if (!database) {
    database = drizzle(resolveTransport(), { schema });
  }
  return database;
}

export { schema };
