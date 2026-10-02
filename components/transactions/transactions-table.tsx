"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/analytics/format";
import { formatDateTime } from "@/lib/analytics/month";
import type { TransactionSort } from "@/lib/db/repository";
import type { Transaction, TransactionType } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<TransactionType, string> = {
  income:
    "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  expense: "border-destructive/30 bg-destructive/10 text-destructive",
  transfer: "border-border bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

function SortButton({
  label,
  field,
  sort,
  onSortChange,
  className,
}: {
  label: string;
  field: TransactionSort["field"];
  sort: TransactionSort;
  onSortChange: (field: TransactionSort["field"]) => void;
  className?: string;
}) {
  const active = sort.field === field;
  const Icon = !active
    ? ChevronsUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 gap-1 px-2", className)}
      onClick={() => onSortChange(field)}
    >
      {label}
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

export function TransactionsTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  loading,
  onSortChange,
  onPageChange,
}: {
  rows: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  sort: TransactionSort;
  loading: boolean;
  onSortChange: (field: TransactionSort["field"]) => void;
  onPageChange: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">
              <SortButton
                label="Date"
                field="date"
                sort={sort}
                onSortChange={onSortChange}
              />
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">
              <SortButton
                label="Amount"
                field="amount"
                sort={sort}
                onSortChange={onSortChange}
                className="ml-auto"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 6 }).map((__, cell) => (
                  <TableCell key={cell}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-sm text-muted-foreground"
              >
                No transactions match these filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                  {formatDateTime(transaction.date)}
                </TableCell>
                <TableCell className="max-w-[320px] truncate font-medium">
                  {transaction.description || transaction.notes || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {transaction.category || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {transaction.account || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("font-normal", TYPE_STYLES[transaction.type])}
                  >
                    {TYPE_LABELS[transaction.type]}
                  </Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-semibold tabular-nums whitespace-nowrap",
                    transaction.type === "income" &&
                      "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {transaction.type === "income"
                    ? "+"
                    : transaction.type === "expense"
                      ? "−"
                      : ""}
                  {formatCurrency(transaction.amount)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm">
        <span className="text-muted-foreground">
          {loading
            ? "Loading…"
            : `Showing ${start}–${end} of ${total.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
