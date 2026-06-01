/**
 * Locale-aware formatting helpers (BRL currency, numbers, percent, dates).
 * Used where next-intl's `useFormatter` is awkward — e.g. Recharts tick
 * formatters and pure helpers outside the React tree.
 */

import type { Locale } from "@/lib/types";

const tag = (l: Locale): string => (l === "pt-BR" ? "pt-BR" : "en-US");

export function formatCurrency(
  value: number,
  locale: Locale,
  opts: { decimals?: number } = {},
): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  }).format(value);
}

/** Compact BRL for chart axes, e.g. "R$ 1,2 mi". */
export function formatCompactCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(
  value: number,
  locale: Locale,
  opts: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(tag(locale), opts).format(value);
}

/** `ratio` is 0..1. */
export function formatPercent(
  ratio: number,
  locale: Locale,
  decimals = 0,
): string {
  return new Intl.NumberFormat(tag(locale), {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

export function formatDate(
  iso: string,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(tag(locale), opts).format(new Date(iso));
}
