import { format, parseISO } from "date-fns";

/** Current month as `YYYY-MM`. */
export function currentMonthKey(): string {
  return format(new Date(), "yyyy-MM");
}

/** Shift a `YYYY-MM` key by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const date = parseISO(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  return format(date, "yyyy-MM");
}

/** `2026-10` -> `October 2026`. */
export function formatMonthLabel(month: string): string {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}

/** `2026-10` -> `Oct`. */
export function formatMonthShort(month: string): string {
  return format(parseISO(`${month}-01`), "MMM");
}

/** `2026-10` -> `Oct 2026`. */
export function formatMonthMedium(month: string): string {
  return format(parseISO(`${month}-01`), "MMM yyyy");
}

/** ISO datetime -> `30 Sep 2026`. */
export function formatDay(iso: string): string {
  return format(parseISO(iso), "dd MMM yyyy");
}

/** ISO datetime -> `30 Sep 2026, 11:34`. */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "dd MMM yyyy, HH:mm");
}
