"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Brazilian thousands grouping for the integer reais being typed. */
const grouper = new Intl.NumberFormat("pt-BR");

/**
 * BRL amount input with an `R$` adornment.
 *
 * Behaviour (per the Liquid spec):
 * - Shows a hyphen placeholder (`R$ —`) while empty — never a `0` default.
 * - Composes digits right-to-left as whole reais (calculator-style), grouped
 *   with Brazilian thousands separators.
 * - Emits a `number` (0 when cleared).
 */
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
  // 0 / non-finite renders as empty so the placeholder shows.
  const display =
    Number.isFinite(value) && value !== 0 ? grouper.format(Math.round(value)) : "";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <Input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={display}
        placeholder="—"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 12);
          onChange(digits ? parseInt(digits, 10) : 0);
        }}
        className={cn("pl-6 tabular-nums", className)}
      />
    </div>
  );
}
