import Papa from "papaparse";
import type { TransactionType } from "@/lib/db/schema";
import { computeDedupeHash } from "./dedupe";
import { decodeMoneyManagerIcons } from "./icons";
import {
  ImportFormatError,
  type ColumnMap,
  type ImportRowError,
  type NormalizedTransaction,
  type ParsedImport,
  type RawTable,
} from "./types";

export interface MoneyManagerParseOptions {
  /** Logical source label stored on each row (used by the dedupe index). */
  source?: string;
  /** How to read `dd/MM` vs `MM/dd` when the date is ambiguous. */
  dateOrder?: "auto" | "dmy" | "mdy";
  /** Fallback currency when the export has no currency column. */
  defaultCurrency?: string;
}

const DEFAULT_SOURCE = "money-manager";
const DEFAULT_DATE_ORDER = "auto";
const DEFAULT_CURRENCY = "INR";

/**
 * Maps our fields to the header names Money Manager uses. Matching is done on
 * a normalized header (lowercase, alphanumerics only), so "Income/Expense",
 * "Sub Category" and "Sub-Category" all resolve. Add aliases here if the
 * export format changes.
 */
const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  date: ["date", "datetime", "transactiondate", "time"],
  account: ["account", "accountname", "accounts"],
  category: ["category", "categoryname"],
  subcategory: ["subcategory", "subcat", "subcategoryname"],
  note: ["note", "notes", "memo", "remark", "remarks"],
  amount: ["amount", "value"],
  type: ["incomeexpense", "type", "transactiontype", "inout", "flow"],
  description: ["description", "desc", "merchant", "payee"],
  currency: ["currency", "currencycode"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function detectColumns(headers: string[]): ColumnMap {
  const normalized = new Map<string, string>();
  for (const header of headers) {
    const key = normalizeHeader(header);
    if (key && !normalized.has(key)) normalized.set(key, header);
  }

  const map = {} as ColumnMap;
  for (const field of Object.keys(COLUMN_ALIASES) as (keyof ColumnMap)[]) {
    let match: string | null = null;
    for (const alias of COLUMN_ALIASES[field]) {
      const found = normalized.get(alias);
      if (found) {
        match = found;
        break;
      }
    }
    map[field] = match;
  }
  return map;
}

function parseAmount(value: string | undefined): number | null {
  if (value == null) return null;
  let text = String(value).trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }
  if (!/^\d*\.?\d+$/.test(text)) return null;

  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

function parseDateTime(
  value: string | undefined,
  order: "auto" | "dmy" | "mdy",
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const [datePart, timePart] = trimmed.split(/[ T]+/);
  const parts = datePart.split(/[/\-.]/).map((part) => part.trim());
  if (parts.length !== 3) return null;

  let year: number;
  let month: number;
  let day: number;

  if (parts[0].length === 4) {
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    year = Number(parts[2]);
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    const useMonthFirst =
      order === "mdy" || (order === "auto" && a <= 12 && b > 12);
    if (useMonthFirst) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (timePart) {
    const time = timePart.split(":").map((part) => Number(part));
    hours = time[0] ?? 0;
    minutes = time[1] ?? 0;
    seconds = Math.floor(time[2] ?? 0);
  }

  if (
    year < 1900 ||
    year > 2200 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function mapType(value: string | undefined): TransactionType | null {
  if (!value) return null;
  const key = value.toLowerCase().replace(/[^a-z]/g, "");
  if (!key) return null;
  if (key.startsWith("income") || key === "in" || key === "credit") {
    return "income";
  }
  if (key.startsWith("expense") || key.startsWith("spending") || key === "out" || key === "debit") {
    return "expense";
  }
  if (key.startsWith("transfer") || key === "move") {
    return "transfer";
  }
  return null;
}

function cell(row: Record<string, string>, header: string | null): string {
  if (!header) return "";
  const value = row[header];
  return value == null ? "" : String(value).trim();
}

/** Reads a text column and decodes Money Manager's icon-font glyphs. */
function textCell(row: Record<string, string>, header: string | null): string {
  return decodeMoneyManagerIcons(cell(row, header));
}

/**
 * Makes every header unique so duplicate column names in an export (for
 * example a second "Account" column) cannot shadow the real one. The first
 * occurrence keeps the original name; later ones get a `_2`, `_3` suffix.
 */
export function dedupeHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((value, index) => {
    const base = value && value.trim() ? value.trim() : `column${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

/** Converts a 2D sheet (as produced by SheetJS) into a `RawTable`. */
export function tableFromMatrix(matrix: unknown[][]): RawTable {
  const headerRow = matrix[0] ?? [];
  const headers = dedupeHeaders(headerRow.map((value) => (value == null ? "" : String(value))));

  const rows = matrix
    .slice(1)
    .filter((row) =>
      Array.isArray(row) &&
      row.some((value) => value != null && String(value).trim() !== ""),
    )
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        const value = row[index];
        record[header] = value == null ? "" : String(value).trim();
      });
      return record;
    });

  return { headers, rows };
}

/**
 * Core normalizer: takes any tabular representation of a Money Manager export
 * and turns it into normalized transactions plus row-level errors.
 */
export async function parseMoneyManagerTable(
  table: RawTable,
  options: MoneyManagerParseOptions = {},
): Promise<ParsedImport> {
  const source = options.source ?? DEFAULT_SOURCE;
  const dateOrder = options.dateOrder ?? DEFAULT_DATE_ORDER;
  const defaultCurrency = options.defaultCurrency ?? DEFAULT_CURRENCY;

  const headers = table.headers;
  if (headers.length === 0) {
    throw new ImportFormatError("The file has no header row.");
  }

  const columnMap = detectColumns(headers);
  if (!columnMap.date) {
    throw new ImportFormatError(
      "Could not find a date column. Expected a column named 'Date'.",
    );
  }
  if (!columnMap.amount) {
    throw new ImportFormatError(
      "Could not find an amount column. Expected a column named 'Amount'.",
    );
  }

  const rows: NormalizedTransaction[] = [];
  const errors: ImportRowError[] = [];

  for (let index = 0; index < table.rows.length; index += 1) {
    const row = table.rows[index];
    const rowNumber = index + 1;

    const date = parseDateTime(cell(row, columnMap.date), dateOrder);
    if (!date) {
      errors.push({
        row: rowNumber,
        reason: `Unrecognized date: "${cell(row, columnMap.date)}"`,
        raw: row,
      });
      continue;
    }

    const rawAmount = parseAmount(cell(row, columnMap.amount));
    if (rawAmount == null) {
      errors.push({
        row: rowNumber,
        reason: `Unrecognized amount: "${cell(row, columnMap.amount)}"`,
        raw: row,
      });
      continue;
    }

    const typeValue = cell(row, columnMap.type);
    let type = columnMap.type ? mapType(typeValue) : null;
    if (!type && !columnMap.type) {
      type = rawAmount < 0 ? "expense" : "income";
    }
    if (!type) {
      errors.push({
        row: rowNumber,
        reason: `Unrecognized transaction type: "${typeValue}"`,
        raw: row,
      });
      continue;
    }

    const account = textCell(row, columnMap.account);
    const category = textCell(row, columnMap.category);
    const subcategory = textCell(row, columnMap.subcategory);
    const note = textCell(row, columnMap.note);

    let description = textCell(row, columnMap.description);
    if (!description) description = note;
    const notes = description === note ? "" : note;

    const currency = textCell(row, columnMap.currency) || defaultCurrency;
    const amount = Math.round(Math.abs(rawAmount) * 100);

    const normalized: NormalizedTransaction = {
      date,
      description,
      amount,
      type,
      category,
      subcategory,
      account,
      notes,
      currency,
      source,
      sourceTransactionId: null,
      dedupeHash: "",
    };

    normalized.dedupeHash = await computeDedupeHash(normalized);
    rows.push(normalized);
  }

  return {
    columnMap,
    headers,
    totalRows: table.rows.length,
    rows,
    errors,
  };
}

/** Parse a comma/semicolon/tab separated Money Manager export. */
export async function parseMoneyManagerCsv(
  input: string,
  options: MoneyManagerParseOptions = {},
): Promise<ParsedImport> {
  const text = input.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });
  return parseMoneyManagerTable(tableFromMatrix(parsed.data), options);
}

/**
 * Parse an `.xlsx` / `.xls` Money Manager export. SheetJS is loaded lazily so
 * it only ships to users who actually import a spreadsheet.
 */
export async function parseMoneyManagerXlsx(
  data: ArrayBuffer,
  options: MoneyManagerParseOptions = {},
): Promise<ParsedImport> {
  const xlsxModule = (await import("xlsx")) as unknown as {
    default?: typeof import("xlsx");
  } & typeof import("xlsx");
  const XLSX = xlsxModule.default ?? xlsxModule;

  const workbook = XLSX.read(data, { type: "array" });

  let matrix: unknown[][] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const candidate = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][];
    if (
      candidate.some((row) =>
        row.some((value) => value != null && String(value).trim() !== ""),
      )
    ) {
      matrix = candidate;
      break;
    }
  }

  if (matrix.length === 0) {
    throw new ImportFormatError("The workbook has no data.");
  }

  return parseMoneyManagerTable(tableFromMatrix(matrix), options);
}
