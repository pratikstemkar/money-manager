import { describe, expect, test } from "bun:test";
import { buildMonthlySummary, mergeCategoryChanges } from "./summary";

describe("buildMonthlySummary", () => {
  test("computes savings, rate and expense change", () => {
    const summary = buildMonthlySummary(
      "2026-10",
      { income: 8_500_000, expense: 2_340_000 },
      { income: 7_366_700, expense: 968_900 },
    );

    expect(summary.savings).toBe(6_160_000);
    expect(summary.savingsRate).toBeCloseTo(72.47, 1);
    expect(summary.expenseChange).toBe(1_371_100);
    expect(summary.expenseChangePct).toBeCloseTo(141.51, 1);
  });

  test("has no percentage change without a previous baseline", () => {
    const summary = buildMonthlySummary(
      "2026-10",
      { income: 100_000, expense: 50_000 },
      { income: 0, expense: 0 },
    );
    expect(summary.expenseChangePct).toBeNull();
    expect(summary.savingsRate).toBe(50);
  });
});

describe("mergeCategoryChanges", () => {
  test("reports growth and drop-offs", () => {
    const merged = mergeCategoryChanges(
      [{ category: "Food", total: 420_000, count: 1 }],
      [
        { category: "Food", total: 125_000, count: 1 },
        { category: "Bills", total: 320_000, count: 1 },
      ],
    );

    const food = merged.find((item) => item.category === "Food");
    expect(food?.change).toBe(295_000);

    const bills = merged.find((item) => item.category === "Bills");
    expect(bills?.total).toBe(0);
    expect(bills?.change).toBe(-320_000);
  });
});
