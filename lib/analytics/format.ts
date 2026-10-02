export const CURRENCY = "INR";
export const LOCALE = "en-IN";

/** Convert whole currency units (rupees) to integer minor units (paise). */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer minor units back to whole currency units. */
export function fromMinor(minor: number): number {
  return minor / 100;
}

export function formatCurrency(
  minor: number,
  options: { decimals?: number } = {},
): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: options.decimals ?? 0,
    maximumFractionDigits: options.decimals ?? 0,
  }).format(fromMinor(minor));
}

/** Short form for chart axes, e.g. ₹48K. */
export function formatCurrencyCompact(minor: number): string {
  const value = fromMinor(minor);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
