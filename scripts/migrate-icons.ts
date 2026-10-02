/**
 * One-time maintenance: converts Money Manager icon-font glyphs already stored
 * in the database into real emoji, and refreshes their dedupe hashes so future
 * imports still match.
 *
 * Requires the local database server to be running (`bun run dev:db`).
 * Run with: bun scripts/migrate-icons.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { computeDedupeHash } from "@/lib/importer/dedupe";
import { decodeMoneyManagerIcons } from "@/lib/importer/icons";

const db = getDb();
const rows = await db.select().from(transactions);

const updates: {
  id: number;
  category: string;
  subcategory: string;
  account: string;
  description: string;
  notes: string;
  currency: string;
  dedupeHash: string;
}[] = [];

for (const row of rows) {
  const category = decodeMoneyManagerIcons(row.category);
  const subcategory = decodeMoneyManagerIcons(row.subcategory);
  const account = decodeMoneyManagerIcons(row.account);
  const description = decodeMoneyManagerIcons(row.description);
  const notes = decodeMoneyManagerIcons(row.notes);
  const currency = decodeMoneyManagerIcons(row.currency);

  const changed =
    category !== row.category ||
    subcategory !== row.subcategory ||
    account !== row.account ||
    description !== row.description ||
    notes !== row.notes ||
    currency !== row.currency;

  if (!changed) continue;

  updates.push({
    id: row.id,
    category,
    subcategory,
    account,
    description,
    notes,
    currency,
    dedupeHash: await computeDedupeHash({
      date: row.date,
      account,
      category,
      subcategory,
      type: row.type,
      amount: row.amount,
      currency,
      description,
      notes,
    }),
  });
}

// Pass 1: move changed rows off their old hashes so pass 2 cannot collide with
// the unique (source, dedupe_hash) index.
for (const update of updates) {
  await db
    .update(transactions)
    .set({ dedupeHash: `migrating-${update.id}` })
    .where(eq(transactions.id, update.id));
}

// Pass 2: write the decoded fields and final hashes.
for (const update of updates) {
  const { id, ...fields } = update;
  await db.update(transactions).set(fields).where(eq(transactions.id, id));
}

console.log(`Updated ${updates.length} of ${rows.length} rows.`);
