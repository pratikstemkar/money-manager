import { MIGRATIONS } from "../migrations.generated";
import type { SqlTransport } from "../transport";

/**
 * Browser-only transport: SQLite compiled to WebAssembly (sql.js) with the
 * database persisted in IndexedDB. This lets the static web build run with no
 * server at all (e.g. GitHub Pages) while keeping the exact same Drizzle
 * queries. Data lives in the browser profile and never leaves the device.
 */
const IDB_NAME = "money-manager";
const IDB_STORE = "sqlite";
const IDB_KEY = "database";

type SqlJsDatabase = import("sql.js").Database;

let databasePromise: Promise<SqlJsDatabase> | null = null;

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open IndexedDB"));
  });
}

async function idbGet(key: string): Promise<Uint8Array | undefined> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(IDB_STORE, "readonly")
      .objectStore(IDB_STORE)
      .get(key);
    request.onsuccess = () => resolve(request.result as Uint8Array | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(key: string, value: Uint8Array): Promise<void> {
  const db = await openIndexedDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, "readwrite");
    transaction.objectStore(IDB_STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function readUserVersion(db: SqlJsDatabase): number {
  const result = db.exec("PRAGMA user_version");
  const value = result[0]?.values?.[0]?.[0];
  return typeof value === "number" ? value : 0;
}

async function loadDatabase(): Promise<SqlJsDatabase> {
  const initSqlJs = (await import("sql.js")).default;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const SQL = await initSqlJs({
    locateFile: (file) => `${basePath}/${file}`,
  });

  const saved = await idbGet(IDB_KEY);
  const db =
    saved && saved.length > 0 ? new SQL.Database(saved) : new SQL.Database();

  let version = readUserVersion(db);
  let changed = !saved || saved.length === 0;
  for (const migration of MIGRATIONS) {
    if (migration.version > version) {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      version = migration.version;
      changed = true;
    }
  }

  if (changed) await idbPut(IDB_KEY, db.export());
  return db;
}

function getDatabase(): Promise<SqlJsDatabase> {
  if (!databasePromise) databasePromise = loadDatabase();
  return databasePromise;
}

/** Statements that change the database and therefore need persisting. */
const WRITE_SQL =
  /^\s*(insert|update|delete|replace|create|drop|alter|attach|detach|vacuum|reindex|pragma)/i;

export function createBrowserTransport(): SqlTransport {
  return async (sql, params, method) => {
    const db = await getDatabase();
    const statement = db.prepare(sql);
    const shouldPersist = WRITE_SQL.test(sql);

    try {
      statement.bind((params ?? []).map((value) => value ?? null) as never[]);

      if (method === "run") {
        statement.step();
        const changes = db.getRowsModified();
        if (shouldPersist) await idbPut(IDB_KEY, db.export());
        return { rows: [], changes };
      }

      const rows: unknown[][] = [];
      while (statement.step()) {
        rows.push(statement.get() as unknown[]);
      }
      // `INSERT ... RETURNING` (used by our importer) runs through here too.
      if (shouldPersist) await idbPut(IDB_KEY, db.export());
      return { rows: method === "get" ? rows.slice(0, 1) : rows };
    } finally {
      statement.free();
    }
  };
}
