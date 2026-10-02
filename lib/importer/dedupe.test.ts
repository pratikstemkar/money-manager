import { describe, expect, test } from "bun:test";
import { computeDedupeHash } from "./dedupe";

const base = {
  date: "2026-10-01T09:05:00",
  account: "HDFC",
  category: "Transport",
  subcategory: "Cab",
  type: "expense",
  amount: 120_000,
  currency: "INR",
  description: "Airport drop",
  notes: "",
};

describe("computeDedupeHash", () => {
  test("is stable for identical input", async () => {
    expect(await computeDedupeHash(base)).toBe(
      await computeDedupeHash({ ...base }),
    );
  });

  test("changes when a meaningful field changes", async () => {
    const original = await computeDedupeHash(base);
    expect(await computeDedupeHash({ ...base, amount: 120_001 })).not.toBe(
      original,
    );
    expect(await computeDedupeHash({ ...base, category: "Food" })).not.toBe(
      original,
    );
  });
});
