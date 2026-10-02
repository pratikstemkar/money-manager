/**
 * Local SQLite server for browser development.
 *
 * The browser build has no Node/Bun runtime, so Drizzle's proxy transport
 * forwards SQL here. This server owns the `.db` file and applies migrations.
 * It is a development convenience only and is never shipped with the desktop
 * build (Tauri talks to SQLite directly through its SQL plugin).
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const port = Number(process.env.MONEY_MANAGER_DB_PORT ?? 4319);
const dbPath = resolve(
  process.env.MONEY_MANAGER_DB ??
    resolve(process.cwd(), "data", "money-manager.db"),
);

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

migrate(drizzle(sqlite), {
  migrationsFolder: resolve(process.cwd(), "drizzle"),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

interface SqlRequestBody {
  sql: string;
  params?: unknown[];
  method?: "run" | "all" | "get" | "values";
}

const server = Bun.serve({
  port,
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    let body: SqlRequestBody;
    try {
      body = (await request.json()) as SqlRequestBody;
    } catch {
      return new Response("Invalid JSON body", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { sql, params = [], method = "all" } = body;

    try {
      const statement = sqlite.prepare(sql);

      if (method === "run") {
        const info = statement.run(...(params as never[]));
        return Response.json(
          {
            rows: [],
            changes: info.changes,
            lastInsertRowid: Number(info.lastInsertRowid),
          },
          { headers: corsHeaders },
        );
      }

      const rows = statement.values(...(params as never[]));
      return Response.json(
        { rows: method === "get" ? rows.slice(0, 1) : rows },
        { headers: corsHeaders },
      );
    } catch (error) {
      return new Response(error instanceof Error ? error.message : String(error), {
        status: 400,
        headers: corsHeaders,
      });
    }
  },
});

console.log(
  `[db] ${dbPath}\n[db] listening on http://127.0.0.1:${server.port}`,
);
