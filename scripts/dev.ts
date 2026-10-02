/**
 * Runs the Next.js dev server and the local SQLite server together.
 */
import { spawn } from "bun";

const children = [
  spawn(["bun", "run", "dev:db"], { stdout: "inherit", stderr: "inherit" }),
  spawn(["bun", "run", "dev:next"], { stdout: "inherit", stderr: "inherit" }),
];

function shutdown() {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.all(children.map((child) => child.exited));
