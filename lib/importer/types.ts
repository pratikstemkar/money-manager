import type { TransactionType } from "@/lib/db/schema";

/** Fields we know how to pull out of a Money Manager export. */
export interface ColumnMap {
  date: string | null;
  account: string | null;
  category: string | null;
  subcategory: string | null;
  note: string | null;
  amount: string | null;
  type: string | null;
  description: string | null;
  currency: string | null;
}

export type NormalizedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  subcategory: string;
  account: string;
  notes: string;
  currency: string;
  source: string;
  sourceTransactionId: string | null;
  dedupeHash: string;
};

export interface ImportRowError {
  /** 1-based data row number, excluding the header. */
  row: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ParsedImport {
  columnMap: ColumnMap;
  headers: string[];
  totalRows: number;
  rows: NormalizedTransaction[];
  errors: ImportRowError[];
}

/** A parsed tabular sheet: unique header names plus string-valued rows. */
export interface RawTable {
  headers: string[];
  rows: Record<string, string>[];
}

export class ImportFormatError extends Error {}
