import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "./index";
import {
  transactions,
  type NewTransaction,
  type Transaction,
  type TransactionType,
} from "./schema";

export interface MonthlyTotals {
  income: number;
  expense: number;
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface CategorySlice {
  category: string;
  total: number;
  count: number;
}

export interface TransactionFilters {
  search?: string;
  category?: string;
  account?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
}

export interface TransactionSort {
  field: "date" | "amount";
  direction: "asc" | "desc";
}

export interface TransactionPage {
  rows: Transaction[];
  total: number;
}

const MONTH_EXPR = sql`substr(${transactions.date}, 1, 7)`;

/** Aggregate income and expense (minor units) for a single `YYYY-MM`. */
export async function getMonthlyTotals(month: string): Promise<MonthlyTotals> {
  const db = getDb();
  const rows = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(sql`${MONTH_EXPR} = ${month}`);

  return {
    income: Number(rows[0]?.income ?? 0),
    expense: Number(rows[0]?.expense ?? 0),
  };
}

/** Income and expense per month, oldest first. */
export async function getMonthlySeries(limit = 12): Promise<MonthlyPoint[]> {
  const db = getDb();
  const rows = await db
    .select({
      month: sql<string>`substr(${transactions.date}, 1, 7)`,
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(sql`${transactions.type} in ('income', 'expense')`)
    .groupBy(sql`substr(${transactions.date}, 1, 7)`)
    .orderBy(sql`substr(${transactions.date}, 1, 7)`);

  return rows
    .map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    }))
    .slice(-limit);
}

/** Expense totals grouped by category for a single month, largest first. */
export async function getCategoryBreakdown(
  month: string,
): Promise<CategorySlice[]> {
  const db = getDb();
  const label = sql<string>`case when ${transactions.category} = '' then 'Uncategorized' else ${transactions.category} end`;
  const rows = await db
    .select({
      category: label,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(
      sql`${transactions.type} = 'expense' and ${MONTH_EXPR} = ${month}`,
    )
    .groupBy(label)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((row) => ({
    category: row.category,
    total: Number(row.total),
    count: Number(row.count),
  }));
}

/** Largest individual expenses in a month. */
export async function getTopExpenses(
  month: string,
  limit = 6,
): Promise<Transaction[]> {
  const db = getDb();
  return db
    .select()
    .from(transactions)
    .where(sql`${transactions.type} = 'expense' and ${MONTH_EXPR} = ${month}`)
    .orderBy(desc(transactions.amount))
    .limit(limit);
}

function buildConditions(filters: TransactionFilters) {
  const conditions = [];
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(transactions.description, term),
        like(transactions.notes, term),
      ),
    );
  }
  if (filters.category) {
    conditions.push(eq(transactions.category, filters.category));
  }
  if (filters.account) {
    conditions.push(eq(transactions.account, filters.account));
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type));
  }
  if (filters.from) {
    conditions.push(gte(transactions.date, `${filters.from}T00:00:00`));
  }
  if (filters.to) {
    conditions.push(lte(transactions.date, `${filters.to}T23:59:59`));
  }
  return conditions.length ? and(...conditions) : undefined;
}

/** Filtered, sorted, paginated transaction list. */
export async function getTransactions(options: {
  filters?: TransactionFilters;
  sort?: TransactionSort;
  page?: number;
  pageSize?: number;
}): Promise<TransactionPage> {
  const { filters = {}, sort, page = 1, pageSize = 50 } = options;
  const db = getDb();
  const where = buildConditions(filters);

  const sortField =
    sort?.field === "amount" ? transactions.amount : transactions.date;
  const orderBy =
    sort?.direction === "asc" ? asc(sortField) : desc(sortField);

  const rows = await db
    .select()
    .from(transactions)
    .where(where)
    .orderBy(orderBy, desc(transactions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db
    .select({ value: count() })
    .from(transactions)
    .where(where);

  return { rows, total: Number(totalRows[0]?.value ?? 0) };
}

export async function getDistinctValues(
  column: "category" | "account",
): Promise<string[]> {
  const db = getDb();
  const target =
    column === "category" ? transactions.category : transactions.account;
  const rows = await db
    .selectDistinct({ value: target })
    .from(transactions)
    .where(ne(target, ""))
    .orderBy(asc(target));
  return rows.map((row) => row.value).filter(Boolean);
}

export async function getAvailableMonths(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ month: sql<string>`substr(${transactions.date}, 1, 7)` })
    .from(transactions)
    .orderBy(desc(sql`substr(${transactions.date}, 1, 7)`));
  return rows.map((row) => row.month).filter(Boolean);
}

export async function getTransactionCount(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ value: count() }).from(transactions);
  return Number(rows[0]?.value ?? 0);
}

/** Dedupe hashes that already exist for a given source. */
export async function getExistingHashes(
  source: string,
  hashes: string[],
): Promise<Set<string>> {
  const result = new Set<string>();
  if (hashes.length === 0) return result;

  const db = getDb();
  const chunkSize = 400;
  for (let index = 0; index < hashes.length; index += chunkSize) {
    const chunk = hashes.slice(index, index + chunkSize);
    const rows = await db
      .select({ hash: transactions.dedupeHash })
      .from(transactions)
      .where(
        and(
          eq(transactions.source, source),
          inArray(transactions.dedupeHash, chunk),
        ),
      );
    for (const row of rows) result.add(row.hash);
  }
  return result;
}

/**
 * Insert transactions, ignoring any that collide with the
 * `(source, dedupe_hash)` unique index. Returns the number inserted.
 */
export async function insertTransactions(
  rows: NewTransaction[],
): Promise<number> {
  if (rows.length === 0) return 0;

  const db = getDb();
  const chunkSize = 200;
  let inserted = 0;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const result = await db
      .insert(transactions)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: transactions.id });
    inserted += result.length;
  }

  return inserted;
}
