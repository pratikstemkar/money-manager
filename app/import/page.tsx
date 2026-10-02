"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FileDrop } from "@/components/import/file-drop";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { confirmImport, previewImport, previewImportFile, type ImportPreview } from "@/lib/importer/import";
import { SAMPLE_CSV } from "@/lib/importer/fixtures/sample";
import type { ColumnMap } from "@/lib/importer/types";

type Phase = "idle" | "parsing" | "preview" | "importing" | "done";

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  date: "Date",
  account: "Account",
  category: "Category",
  subcategory: "Subcategory",
  note: "Note",
  amount: "Amount",
  type: "Income/Expense",
  description: "Description",
  currency: "Currency",
};

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "positive"
            ? "text-2xl font-semibold text-emerald-600 dark:text-emerald-400"
            : tone === "warning"
              ? "text-2xl font-semibold text-amber-600 dark:text-amber-400"
              : "text-2xl font-semibold"
        }
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string>();
  const [preview, setPreview] = useState<ImportPreview>();
  const [imported, setImported] = useState(0);

  async function runPreview(promise: Promise<ImportPreview>, name: string) {
    setPhase("parsing");
    setFileName(name);
    try {
      const result = await promise;
      setPreview(result);
      setPhase("preview");
    } catch (error) {
      toast.error("Could not read that file", {
        description: error instanceof Error ? error.message : String(error),
      });
      setPhase("idle");
    }
  }

  function handleFile(file: File) {
    void runPreview(previewImportFile(file), file.name);
  }

  async function handleConfirm() {
    if (!preview) return;
    setPhase("importing");
    try {
      const count = await confirmImport(preview.toImport);
      setImported(count);
      setPhase("done");
      toast.success(
        `Imported ${count.toLocaleString()} transaction${count === 1 ? "" : "s"}`,
      );
    } catch (error) {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : String(error),
      });
      setPhase("preview");
    }
  }

  function reset() {
    setPhase("idle");
    setFileName(undefined);
    setPreview(undefined);
    setImported(0);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import"
        description="Import a CSV or Excel file exported from the Money Manager app."
      />

      {phase === "idle" || phase === "parsing" ? (
        <div className="space-y-4">
          <FileDrop onFile={handleFile} disabled={phase === "parsing"} />
          {phase === "parsing" ? (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading {fileName}…
            </p>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => runPreview(previewImport(SAMPLE_CSV), "sample.csv")}
              >
                Load sample data
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {phase === "preview" || phase === "importing" ? (
        preview ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total rows" value={preview.totalRows} />
              <Stat label="Valid" value={preview.valid} tone="positive" />
              <Stat
                label="Duplicates"
                value={preview.duplicates}
                tone="warning"
              />
              <Stat label="Invalid" value={preview.invalid} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detected columns</CardTitle>
                <CardDescription>
                  How we mapped the columns in {fileName}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map(
                  (field) => {
                    const header = preview.columnMap[field];
                    return (
                      <Badge
                        key={field}
                        variant={header ? "secondary" : "outline"}
                        className="font-normal"
                      >
                        <span className="text-muted-foreground">
                          {FIELD_LABELS[field]}:
                        </span>
                        <span className="ml-1">
                          {header ?? "not found"}
                        </span>
                      </Badge>
                    );
                  },
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New transactions to import</CardTitle>
                <CardDescription>
                  Showing the first {preview.sample.length} of{" "}
                  {preview.toImport.length} rows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {preview.sample.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nothing new to import. Every valid row already exists.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.sample.map((row, index) => (
                        <TableRow key={`${row.dedupeHash}-${index}`}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDateTime(row.date)}
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate font-medium">
                            {row.description || row.notes || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.category || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.account || "—"}
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground">
                            {row.type}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {preview.errors.length > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {preview.errors.length} row
                  {preview.errors.length === 1 ? "" : "s"} could not be parsed
                </AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-xs">
                    {preview.errors.slice(0, 10).map((error) => (
                      <li key={error.row}>
                        Row {error.row}: {error.reason}
                      </li>
                    ))}
                    {preview.errors.length > 10 ? (
                      <li>…and {preview.errors.length - 10} more.</li>
                    ) : null}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={reset}
                disabled={phase === "importing"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={phase === "importing" || preview.toImport.length === 0}
              >
                {phase === "importing" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Import {preview.toImport.length.toLocaleString()}{" "}
                transaction{preview.toImport.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        ) : null
      ) : null}

      {phase === "done" ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Import complete</h2>
              <p className="text-sm text-muted-foreground">
                Added {imported.toLocaleString()} new transaction
                {imported === 1 ? "" : "s"}. Duplicates were skipped.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/transactions">View transactions</Link>
              </Button>
              <Button variant="ghost" onClick={reset}>
                <RefreshCw className="mr-2 h-4 w-4" /> Import another file
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
