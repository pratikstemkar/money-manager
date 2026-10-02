import type { CategorySlice, MonthlyTotals } from "@/lib/db/repository";

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  savings: number;
  /** Savings as a percentage of income (0 when income is 0). */
  savingsRate: number;
  previousExpense: number;
  /** Change in expenses vs the previous month, in minor units. */
  expenseChange: number;
  /** Percentage change in expenses, or null when there is no baseline. */
  expenseChangePct: number | null;
}

export function buildMonthlySummary(
  month: string,
  current: MonthlyTotals,
  previous: MonthlyTotals,
): MonthlySummary {
  const savings = current.income - current.expense;
  const savingsRate =
    current.income > 0 ? (savings / current.income) * 100 : 0;
  const expenseChange = current.expense - previous.expense;
  const expenseChangePct =
    previous.expense > 0 ? (expenseChange / previous.expense) * 100 : null;

  return {
    month,
    income: current.income,
    expense: current.expense,
    savings,
    savingsRate,
    previousExpense: previous.expense,
    expenseChange,
    expenseChangePct,
  };
}

export interface CategoryChange {
  category: string;
  total: number;
  previousTotal: number;
  change: number;
}

/** Combine this month's categories with last month's to show deltas. */
export function mergeCategoryChanges(
  current: CategorySlice[],
  previous: CategorySlice[],
): CategoryChange[] {
  const totals = new Map<string, CategoryChange>();

  for (const slice of current) {
    totals.set(slice.category, {
      category: slice.category,
      total: slice.total,
      previousTotal: 0,
      change: 0,
    });
  }

  for (const slice of previous) {
    const existing = totals.get(slice.category);
    if (existing) {
      existing.previousTotal = slice.total;
    } else {
      totals.set(slice.category, {
        category: slice.category,
        total: 0,
        previousTotal: slice.total,
        change: 0,
      });
    }
  }

  const result = Array.from(totals.values());
  for (const item of result) {
    item.change = item.total - item.previousTotal;
  }
  return result.sort((a, b) => b.total - a.total);
}
