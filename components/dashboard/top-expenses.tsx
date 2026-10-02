"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/analytics/format";
import { formatDay } from "@/lib/analytics/month";
import type { Transaction } from "@/lib/db/schema";

export function TopExpenses({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No expenses recorded for this month.
          </p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {transaction.description ||
                      transaction.notes ||
                      transaction.category ||
                      "Transaction"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDay(transaction.date)}</span>
                    {transaction.category ? (
                      <Badge variant="secondary" className="font-normal">
                        {transaction.category}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(transaction.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
