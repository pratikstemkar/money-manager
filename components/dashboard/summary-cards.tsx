"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent } from "@/lib/analytics/format";
import type { MonthlySummary } from "@/lib/analytics/summary";
import { cn } from "@/lib/utils";

function Change({
  value,
  percentage,
  invert = false,
}: {
  value: number;
  percentage: number | null;
  invert?: boolean;
}) {
  const flat = value === 0;
  const positive = value > 0;
  const good = invert ? !positive : positive;
  const Icon = flat ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        flat
          ? "text-muted-foreground"
          : good
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatCurrency(Math.abs(value))}
      {percentage != null ? ` (${formatPercent(Math.abs(percentage))})` : ""}
      <span className="font-normal text-muted-foreground">
        vs last month
      </span>
    </span>
  );
}

function StatCard({
  title,
  value,
  footer,
  accent,
  loading,
}: {
  title: string;
  value: string;
  footer?: React.ReactNode;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold tabular-nums"
              style={accent ? { color: accent } : undefined}
            >
              {value}
            </span>
          </div>
        )}
        {loading ? <Skeleton className="h-4 w-40" /> : footer}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  summary,
  loading,
}: {
  summary: MonthlySummary | undefined;
  loading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Income"
        value={summary ? formatCurrency(summary.income) : "—"}
        accent="var(--income)"
        loading={loading}
        footer={
          <span className="text-xs text-muted-foreground">
            This month
          </span>
        }
      />
      <StatCard
        title="Expenses"
        value={summary ? formatCurrency(summary.expense) : "—"}
        accent="var(--expense)"
        loading={loading}
        footer={
          summary ? (
            <Change
              value={summary.expenseChange}
              percentage={summary.expenseChangePct}
              invert
            />
          ) : null
        }
      />
      <StatCard
        title="Net savings"
        value={summary ? formatCurrency(summary.savings) : "—"}
        loading={loading}
        footer={
          <span className="text-xs text-muted-foreground">
            Income minus expenses
          </span>
        }
      />
      <StatCard
        title="Savings rate"
        value={summary ? formatPercent(summary.savingsRate) : "—"}
        loading={loading}
        footer={
          <span className="text-xs text-muted-foreground">
            Share of income kept
          </span>
        }
      />
    </div>
  );
}
