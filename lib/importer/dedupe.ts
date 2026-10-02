/**
 * Stable fingerprint used to detect transactions that were already imported.
 * Re-importing the same export produces the same hashes, so the unique
 * `(source, dedupe_hash)` index makes imports idempotent.
 */
export interface DedupeFields {
  date: string;
  account: string;
  category: string;
  subcategory: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  notes: string;
}

const SEPARATOR = "\u001f";

export async function computeDedupeHash(
  fields: DedupeFields,
): Promise<string> {
  const payload = [
    fields.date,
    fields.account,
    fields.category,
    fields.subcategory,
    fields.type,
    String(fields.amount),
    fields.currency,
    fields.description,
    fields.notes,
  ].join(SEPARATOR);

  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
