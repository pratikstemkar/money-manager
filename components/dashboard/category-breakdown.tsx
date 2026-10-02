"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/analytics/format";
import type { CategoryChange } from "@/lib/analytics/summary";
import { cn } from "@/lib/utils";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategoryBreakdown({
  changes,
  previousMonthLabel,
}: {
  changes: CategoryChange[];
  previousMonthLabel: string;
}) {
  const chartData = changes.filter((item) => item.total > 0);
  const config = Object.fromEntries(
    chartData.map((item) => [item.category, { label: item.category }]),
  ) as ChartConfig;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by category</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No expenses recorded for this month.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-[200px_1fr]">
        <ChartContainer config={config} className="mx-auto aspect-square h-48">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="category"
                  formatter={(value) => formatCurrency(Number(value))}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="total"
              nameKey="category"
              innerRadius={48}
              outerRadius={80}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((item, index) => (
                <Cell
                  key={item.category}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <ul className="space-y-3">
          {changes.map((item) => {
            const Icon =
              item.change === 0
                ? Minus
                : item.change > 0
                  ? ArrowUpRight
                  : ArrowDownRight;
            return (
              <li
                key={item.category}
                className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.previousTotal > 0 ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5",
                          item.change > 0
                            ? "text-destructive"
                            : item.change < 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "",
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {formatCurrency(Math.abs(item.change))} from{" "}
                        {previousMonthLabel}
                      </span>
                    ) : (
                      "No spend last month"
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.total)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
