"use client";

import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import { cn } from "@/lib/utils";

/** Locale-aware BRL figure with tabular numerals (no jitter on live updates). */
export function Money({
  value,
  compact = false,
  decimals,
  className,
}: {
  value: number;
  compact?: boolean;
  decimals?: number;
  className?: string;
}) {
  const locale = useVisionStore((s) => s.locale);
  const text = compact
    ? formatCompactCurrency(value, locale)
    : formatCurrency(value, locale, { decimals });
  return <span className={cn("tabular-nums", className)}>{text}</span>;
}
