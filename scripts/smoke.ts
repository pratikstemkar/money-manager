/**
 * Development smoke test: parses the sample fixture, imports it, and exercises
 * the repository against a running local database server.
 *
 * Usage:
 *   MONEY_MANAGER_DB=/tmp/smoke.db bun scripts/smoke.ts
 */
import { SAMPLE_CSV } from "@/lib/importer/fixtures/sample";
import { confirmImport, previewImport } from "@/lib/importer/import";
import {
  getCategoryBreakdown,
  getDistinctValues,
  getMonthlySeries,
  getMonthlyTotals,
  getTopExpenses,
  getTransactionCount,
  getTransactions,
} from "@/lib/db/repository";

const preview = await previewImport(SAMPLE_CSV);

console.log("Preview:", {
  totalRows: preview.totalRows,
  valid: preview.valid,
  duplicates: preview.duplicates,
  invalid: preview.invalid,
  toImport: preview.toImport.length,
});

const inserted = await confirmImport(preview.toImport);
console.log("Inserted:", inserted);

const secondPreview = await previewImport(SAMPLE_CSV);
console.log("Second import duplicates:", {
  existing: secondPreview.existingDuplicates,
  withinFile: secondPreview.withinFileDuplicates,
  toImport: secondPreview.toImport.length,
});

console.log("Total transactions:", await getTransactionCount());
console.log("October totals:", await getMonthlyTotals("2026-10"));
console.log("September totals:", await getMonthlyTotals("2026-09"));
console.log(
  "Category breakdown:",
  await getCategoryBreakdown("2026-10"),
);
console.log("Series:", await getMonthlySeries(12));
console.log("Top expenses:", (await getTopExpenses("2026-10", 3)).length);
console.log("Distinct categories:", await getDistinctValues("category"));
console.log("Distinct accounts:", await getDistinctValues("account"));

const pageOne = await getTransactions({
  filters: { type: "expense" },
  sort: { field: "amount", direction: "desc" },
  page: 1,
  pageSize: 5,
});
console.log("Expense page:", {
  total: pageOne.total,
  returned: pageOne.rows.length,
  top: pageOne.rows[0]?.description,
});
