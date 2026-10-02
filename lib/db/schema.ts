import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Amounts are stored as integer minor units (paise/cents) to keep sums exact.
 * `date` is an ISO-8601 local timestamp, e.g. `2026-09-30T11:34:13`.
 * `type` drives the direction of the money; `amount` is always positive.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    description: text("description").notNull().default(""),
    amount: integer("amount").notNull(),
    type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
    category: text("category").notNull().default(""),
    subcategory: text("subcategory").notNull().default(""),
    account: text("account").notNull().default(""),
    notes: text("notes").notNull().default(""),
    currency: text("currency").notNull().default("INR"),
    source: text("source").notNull().default("money-manager"),
    sourceTransactionId: text("source_transaction_id"),
    dedupeHash: text("dedupe_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_transactions_date").on(table.date),
    index("idx_transactions_category").on(table.category),
    index("idx_transactions_account").on(table.account),
    index("idx_transactions_type").on(table.type),
    uniqueIndex("uq_transactions_source_dedupe").on(
      table.source,
      table.dedupeHash,
    ),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = Transaction["type"];
