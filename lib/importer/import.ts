import type { NewTransaction } from "@/lib/db/schema";
import {
  getExistingHashes,
  insertTransactions,
} from "@/lib/db/repository";
import { decodeImportFile } from "./encoding";
import {
  parseMoneyManagerCsv,
  parseMoneyManagerXlsx,
  type MoneyManagerParseOptions,
} from "./money-manager";
import type {
  ColumnMap,
  ImportRowError,
  NormalizedTransaction,
  ParsedImport,
} from "./types";

export interface ImportPreview {
  headers: string[];
  columnMap: ColumnMap;
  totalRows: number;
  valid: number;
  invalid: number;
  duplicates: number;
  existingDuplicates: number;
  withinFileDuplicates: number;
  toImport: NormalizedTransaction[];
  errors: ImportRowError[];
  sample: NormalizedTransaction[];
}

function toNewTransaction(
  row: NormalizedTransaction,
): NewTransaction {
  return {
    date: row.date,
    description: row.description,
    amount: row.amount,
    type: row.type,
    category: row.category,
    subcategory: row.subcategory,
    account: row.account,
    notes: row.notes,
    currency: row.currency,
    source: row.source,
    sourceTransactionId: row.sourceTransactionId,
    dedupeHash: row.dedupeHash,
  };
}

async function summarize(
  parsed: ParsedImport,
  source: string,
): Promise<ImportPreview> {
  const hashes = parsed.rows.map((row) => row.dedupeHash);
  const existing = await getExistingHashes(source, hashes);

  const seen = new Set<string>();
  const toImport: NormalizedTransaction[] = [];
  let existingDuplicates = 0;
  let withinFileDuplicates = 0;

  for (const row of parsed.rows) {
    if (seen.has(row.dedupeHash)) {
      withinFileDuplicates += 1;
      continue;
    }
    seen.add(row.dedupeHash);
    if (existing.has(row.dedupeHash)) {
      existingDuplicates += 1;
      continue;
    }
    toImport.push(row);
  }

  return {
    headers: parsed.headers,
    columnMap: parsed.columnMap,
    totalRows: parsed.totalRows,
    valid: parsed.rows.length,
    invalid: parsed.errors.length,
    duplicates: existingDuplicates + withinFileDuplicates,
    existingDuplicates,
    withinFileDuplicates,
    toImport,
    errors: parsed.errors,
    sample: toImport.slice(0, 8),
  };
}

/**
 * Parse a CSV export and work out what would happen if it were imported:
 * how many rows are valid, invalid, already in the database, or duplicated
 * within the file itself.
 */
export async function previewImport(
  text: string,
  options: MoneyManagerParseOptions = {},
): Promise<ImportPreview> {
  const parsed = await parseMoneyManagerCsv(text, options);
  return summarize(parsed, options.source ?? "money-manager");
}

/** Same as `previewImport`, but reads the format from the file itself. */
export async function previewImportFile(
  file: File,
  options: MoneyManagerParseOptions = {},
): Promise<ImportPreview> {
  const name = file.name.toLowerCase();
  const isSpreadsheet = name.endsWith(".xlsx") || name.endsWith(".xls");
  const parsed = isSpreadsheet
    ? await parseMoneyManagerXlsx(await file.arrayBuffer(), options)
    : await parseMoneyManagerCsv(decodeImportFile(await file.arrayBuffer()), options);
  return summarize(parsed, options.source ?? "money-manager");
}

/** Insert every non-duplicate transaction. Returns the number added. */
export async function confirmImport(
  rows: NormalizedTransaction[],
): Promise<number> {
  return insertTransactions(rows.map(toNewTransaction));
}
