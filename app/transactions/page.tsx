"use client";

import { useEffect, useState } from "react";
import { TransactionFiltersBar } from "@/components/transactions/transaction-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDistinctValues,
  getTransactions,
  type TransactionFilters,
  type TransactionSort,
} from "@/lib/db/repository";
import { useAsync } from "@/lib/hooks/use-async";

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<TransactionSort>({
    field: "date",
    direction: "desc",
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((current) => ({ ...current, search: search || undefined }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: options } = useAsync(async () => {
    const [categories, accounts] = await Promise.all([
      getDistinctValues("category"),
      getDistinctValues("account"),
    ]);
    return { categories, accounts };
  }, []);

  const { data, loading, error } = useAsync(
    () => getTransactions({ filters, sort, page, pageSize: PAGE_SIZE }),
    [JSON.stringify(filters), sort.field, sort.direction, page],
  );

  const updateFilters = (next: TransactionFilters) => {
    setFilters(next);
    setPage(1);
  };

  const toggleSort = (field: TransactionSort["field"]) => {
    setSort((current) =>
      current.field === field
        ? {
            field,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { field, direction: "desc" },
    );
    setPage(1);
  };

  const reset = () => {
    setSearch("");
    setFilters({});
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description={
          data
            ? `${data.total.toLocaleString()} matching transaction${data.total === 1 ? "" : "s"}`
            : "Search and filter your imported transactions."
        }
      />

      <TransactionFiltersBar
        value={filters}
        categories={options?.categories ?? []}
        accounts={options?.accounts ?? []}
        search={search}
        onSearchChange={setSearch}
        onChange={updateFilters}
        onReset={reset}
      />

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Could not load transactions. Make sure the local database is
            running.
            <p className="mt-2 text-xs">{error.message}</p>
          </CardContent>
        </Card>
      ) : (
        <TransactionsTable
          rows={data?.rows ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          sort={sort}
          loading={loading}
          onSortChange={toggleSort}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
