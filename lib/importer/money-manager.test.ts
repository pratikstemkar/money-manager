import { describe, expect, test } from "bun:test";
import * as XLSX from "xlsx";
import { SAMPLE_CSV } from "./fixtures/sample";
import {
  dedupeHeaders,
  detectColumns,
  parseMoneyManagerCsv,
  parseMoneyManagerXlsx,
  tableFromMatrix,
} from "./money-manager";
import { ImportFormatError } from "./types";

describe("detectColumns", () => {
  test("maps the Money Manager export headers", () => {
    const map = detectColumns([
      "Date",
      "Account",
      "Category",
      "Subcategory",
      "Note",
      "INR",
      "Income/Expense",
      "Description",
      "Amount",
      "Currency",
    ]);

    expect(map.date).toBe("Date");
    expect(map.account).toBe("Account");
    expect(map.category).toBe("Category");
    expect(map.subcategory).toBe("Subcategory");
    expect(map.note).toBe("Note");
    expect(map.amount).toBe("Amount");
    expect(map.type).toBe("Income/Expense");
    expect(map.description).toBe("Description");
    expect(map.currency).toBe("Currency");
  });
});

describe("parseMoneyManagerCsv", () => {
  test("parses the sample fixture", async () => {
    const parsed = await parseMoneyManagerCsv(SAMPLE_CSV);

    expect(parsed.totalRows).toBe(12);
    expect(parsed.rows).toHaveLength(12);
    expect(parsed.errors).toHaveLength(0);

    const incomeAmounts = parsed.rows
      .filter((row) => row.type === "income")
      .map((row) => row.amount);
    expect(incomeAmounts).toContain(8_500_000);

    // Emoji in category names must survive parsing.
    expect(parsed.rows.some((row) => row.category === "💰 Salary")).toBe(true);

    const transfer = parsed.rows.find((row) => row.type === "transfer");
    expect(transfer?.amount).toBe(2_605_792);
  });

  test("resolves ambiguous day/month ordering", async () => {
    const csv = [
      "Date,Amount,Income/Expense",
      "13/02/2026,100,Expense",
      "02/13/2026,100,Expense",
      "2026-12-31,100,Expense",
    ].join("\n");

    const parsed = await parseMoneyManagerCsv(csv);
    expect(parsed.rows.map((row) => row.date.slice(0, 10))).toEqual([
      "2026-02-13",
      "2026-02-13",
      "2026-12-31",
    ]);
  });

  test("parses currency symbols, separators and parentheses", async () => {
    const csv = [
      "Date,Amount,Income/Expense",
      '01/01/2026,"₹1,234.56",Expense',
      "02/01/2026,(500),Expense",
    ].join("\n");

    const parsed = await parseMoneyManagerCsv(csv);
    expect(parsed.rows[0]?.amount).toBe(123_456);
    expect(parsed.rows[1]?.amount).toBe(50_000);
  });

  test("throws when required columns are missing", async () => {
    await expect(
      parseMoneyManagerCsv("Date,Foo\n01/01/2026,x\n"),
    ).rejects.toBeInstanceOf(ImportFormatError);
  });

  test("collects invalid rows instead of throwing", async () => {
    const csv = [
      "Date,Amount,Income/Expense",
      "nope,100,Expense",
      "01/01/2026,abc,Expense",
      "01/01/2026,100,Whatever",
    ].join("\n");

    const parsed = await parseMoneyManagerCsv(csv);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors).toHaveLength(3);
  });
});

describe("dedupeHeaders / tableFromMatrix", () => {
  test("keeps duplicate column names addressable", () => {
    const headers = dedupeHeaders(["Date", "Account", "Amount", "Account"]);
    expect(headers).toEqual(["Date", "Account", "Amount", "Account_2"]);

    const table = tableFromMatrix([
      ["Date", "Account", "Amount", "Account"],
      ["30/09/2026", "HDFC", "1250", "999999"],
    ]);
    // The real account column must not be shadowed by the extra one.
    expect(table.rows[0].Account).toBe("HDFC");
    expect(table.rows[0].Account_2).toBe("999999");
  });
});

describe("parseMoneyManagerXlsx", () => {
  test("parses an .xlsx workbook", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      [
        "Date",
        "Account",
        "Category",
        "Subcategory",
        "Note",
        "Income/Expense",
        "Amount",
        "Currency",
      ],
      [
        "30/09/2026 11:34:13",
        "HDFC",
        "Food",
        "Restaurant",
        "Dinner",
        "Expense",
        "1250.00",
        "INR",
      ],
      [
        "30/09/2026 10:59:01",
        "HDFC",
        "💰 Salary",
        "",
        "",
        "Income",
        "73667.00",
        "INR",
      ],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Transactions");
    const buffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;

    const parsed = await parseMoneyManagerXlsx(buffer);

    expect(parsed.totalRows).toBe(2);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0]?.amount).toBe(125_000);
    expect(parsed.rows[0]?.category).toBe("Food");
    expect(parsed.rows[1]?.type).toBe("income");
    expect(parsed.rows[1]?.category).toBe("💰 Salary");
  });
});
