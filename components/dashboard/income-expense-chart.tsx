"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatCurrencyCompact } from "@/lib/analytics/format";
import { formatMonthShort } from "@/lib/analytics/month";
import type { MonthlyPoint } from "@/lib/db/repository";

const config = {
  income: { label: "Income", color: "var(--income)" },
  expense: { label: "Expenses", color: "var(--expense)" },
} satisfies ChartConfig;

export function IncomeExpenseChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((point) => ({
    label: formatMonthShort(point.month),
    income: point.income,
    expense: point.expense,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-72 w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(value) => formatCurrencyCompact(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    formatCurrency(Number(value)),
                    config[name as keyof typeof config]?.label ?? name,
                  ]}
                />
              }
            />
            <Bar
              dataKey="income"
              fill="var(--color-income)"
              radius={4}
              isAnimationActive={false}
            />
            <Bar
              dataKey="expense"
              fill="var(--color-expense)"
              radius={4}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
