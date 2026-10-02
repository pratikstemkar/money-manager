import type { SqlTransport } from "../transport";

/**
 * Browser development transport. Talks to the small local SQLite server
 * started by `bun run dev:db` (see scripts/db-server.ts).
 */
export function createHttpDevTransport(): SqlTransport {
  const baseUrl =
    process.env.NEXT_PUBLIC_DEV_DB_URL ?? "http://127.0.0.1:4319";

  return async (sql, params, method) => {
    const response = await fetch(`${baseUrl}/sql`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sql, params, method }),
    });

    if (!response.ok) {
      throw new Error(
        `Dev SQL server error (${response.status}): ${await response.text()}`,
      );
    }

    return response.json();
  };
}
