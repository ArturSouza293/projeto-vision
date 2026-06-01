"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** BRL amount input with an R$ adornment; emits a number (0 on empty/NaN). */
export function MoneyInput({
  value,
  onChange,
  className,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
        className={cn("pl-8 tabular-nums", className)}
      />
    </div>
  );
}
