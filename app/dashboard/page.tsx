"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { IncomeExpenseChart } from "@/components/dashboard/income-expense-chart";
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { TopExpenses } from "@/components/dashboard/top-expenses";
import { MonthPicker } from "@/components/layout/month-picker";
import { PageHeader } from "@/components/layout/page-header";
import { currentMonthKey, formatMonthLabel, shiftMonth } from "@/lib/analytics/month";
import { buildMonthlySummary, mergeCategoryChanges } from "@/lib/analytics/summary";
import {
  getCategoryBreakdown,
  getMonthlySeries,
  getMonthlyTotals,
  getTopExpenses,
  getTransactionCount,
} from "@/lib/db/repository";
import { useAsync } from "@/lib/hooks/use-async";

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonthKey());

  const { data, loading, error } = useAsync(async () => {
    const previous = shiftMonth(month, -1);
    const [current, previousTotals, categories, previousCategories, top, series, total] =
      await Promise.all([
        getMonthlyTotals(month),
        getMonthlyTotals(previous),
        getCategoryBreakdown(month),
        getCategoryBreakdown(previous),
        getTopExpenses(month, 6),
        getMonthlySeries(24),
        getTransactionCount(),
      ]);

    return {
      summary: buildMonthlySummary(month, current, previousTotals),
      changes: mergeCategoryChanges(categories, previousCategories),
      previousMonth: previous,
      top,
      series: series.filter((point) => point.month <= month).slice(-6),
      total,
    };
  }, [month]);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Could not load your data. Make sure the local database is running.
            <p className="mt-2 text-xs">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!loading && data?.total === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="See where your money is going."
          actions={<MonthPicker month={month} onChange={setMonth} />}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-medium">No transactions yet</h2>
              <p className="text-sm text-muted-foreground">
                Import a Money Manager CSV export to get started.
              </p>
            </div>
            <Button asChild>
              <Link href="/import">Import transactions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={formatMonthLabel(month)}
        actions={<MonthPicker month={month} onChange={setMonth} />}
      />

      <SummaryCards summary={data?.summary} loading={loading} />

      {loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <IncomeExpenseChart data={data.series} />
          <SpendingTrendChart data={data.series} />
          <CategoryBreakdown
            changes={data.changes}
            previousMonthLabel={formatMonthLabel(data.previousMonth)}
          />
          <TopExpenses transactions={data.top} />
        </div>
      )}
    </div>
  );
}
