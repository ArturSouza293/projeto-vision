"use client";

/**
 * v5 — seletor de Planos A/B/C/D (variantes de caso, deep copy com cor).
 * Duplicar o caso vivo, alternar, remover e abrir o "Resumo dos Planos".
 */
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Columns3, Copy, X } from "@/components/app/icons";
import { PlanSummaryDialog } from "@/components/engine/plan-summary-dialog";
import { Button } from "@/components/ui/button";
import { useVisionStore } from "@/lib/store/plan-store";
import type { VariantColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<VariantColor, string> = {
  blue: "bg-info",
  green: "bg-positive",
  orange: "bg-chart-4",
  purple: "bg-chart-5",
};

export function PlanVariantsRail() {
  const t = useTranslations();
  const variants = useVisionStore((s) => s.caseVariants);
  const activeId = useVisionStore((s) => s.activeVariantId);
  const duplicateAsVariant = useVisionStore((s) => s.duplicateAsVariant);
  const switchVariant = useVisionStore((s) => s.switchVariant);
  const removeVariant = useVisionStore((s) => s.removeVariant);
  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs tracking-wide text-muted-foreground/70 uppercase">
        {t("variants.label")}
      </span>
      {variants.map((v) => {
        const active = v.id === activeId;
        return (
          <span
            key={v.id}
            data-testid={`variant-${v.name.slice(-1)}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary/60 bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", DOT[v.color])} />
            <button type="button" onClick={() => switchVariant(v.id)} className="font-medium">
              {v.name}
            </button>
            {v.isRef && <span className="text-[10px] text-primary">★</span>}
            {variants.length > 1 && (
              <button
                type="button"
                onClick={() => removeVariant(v.id)}
                className="text-muted-foreground hover:text-negative"
                aria-label={t("variants.remove")}
              >
                <X className="size-3.5" />
              </button>
            )}
          </span>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        data-testid="variant-duplicate"
        disabled={variants.length >= 4}
        onClick={duplicateAsVariant}
      >
        <Copy className="size-4" />
        {t("variants.duplicate")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        data-testid="variant-compare"
        disabled={variants.length < 2}
        title={variants.length < 2 ? t("variants.needTwo") : undefined}
        onClick={() => setCompareOpen(true)}
      >
        <Columns3 className="size-4" />
        {t("variants.compare")}
      </Button>

      <PlanSummaryDialog open={compareOpen} onOpenChange={setCompareOpen} />
    </div>
  );
}
