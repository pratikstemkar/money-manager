/**
 * Copies sql.js' WebAssembly binary into public/ so the static web build can
 * load it at runtime. Run with: bun run assets:wasm
 */
const files = ["sql-wasm.wasm", "sql-wasm-browser.wasm"];
for (const file of files) {
  await Bun.write(`public/${file}`, Bun.file(`node_modules/sql.js/dist/${file}`));
}
console.log(`Copied ${files.join(", ")} to public/`);

export {};
