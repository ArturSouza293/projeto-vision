"use client";

/**
 * v5 — Modal "Resumo dos Planos": colunas lado a lado por variante (A/B/C),
 * KPIs do motor (summarize), deltas vs referência, alerta de esgotamento,
 * gap verde/vermelho e próximos passos derivados por regra (sem IA).
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Check, Plus, TriangleAlert } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deltaKPIs, type PlanSummaryKPIs } from "@/engine";
import { nextStepsFor, summarizePlan, type NextStepItem } from "@/lib/engine/plan-compare";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { CaseVariant, VariantColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<VariantColor, string> = {
  blue: "bg-info",
  green: "bg-positive",
  orange: "bg-chart-4",
  purple: "bg-chart-5",
};

interface Coluna {
  variant: CaseVariant;
  kpis: PlanSummaryKPIs;
  steps: NextStepItem[];
}

export function PlanSummaryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const syncedVariants = useVisionStore((s) => s.syncedVariants);
  const setVariantRef = useVisionStore((s) => s.setVariantRef);

  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});

  const fmt = (n: number) => formatCompactCurrency(n, locale);
  const cur = (n: number) => formatCurrency(n, locale);

  // Snapshot + compute on every open (numbers always fresh from the engine).
  useEffect(() => {
    if (!open) return;
    const variants = syncedVariants();
    const resolveEvent = (presetKey: string, label?: string) =>
      label || t(`lifeEvents.preset.${presetKey}`);
    setColunas(
      variants.map((v) => {
        const kpis = summarizePlan(v.plan);
        const resolveGoal = (goalId: string) => {
          const g = v.plan.goals.find((x) => x.id === goalId);
          return g?.label || (g ? t(`goalType.${g.type}`) : goalId);
        };
        return { variant: v, kpis, steps: nextStepsFor(v.plan, kpis, resolveEvent, resolveGoal, fmt) };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ref = colunas.find((c) => c.variant.isRef) ?? colunas[0];

  function Delta({ value, format }: { value: number; format: (n: number) => string }) {
    if (Math.abs(value) < 1) return null;
    const up = value > 0;
    return (
      <span className={cn("text-[11px] font-medium tabular-nums", up ? "text-positive" : "text-negative")}>
        {up ? "▲" : "▼"} {format(Math.abs(value))} {t("planCompare.vsRef")}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="plan-summary"
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="space-y-1 border-b border-border px-6 pt-5 pb-4 text-left">
          <DialogTitle className="font-heading text-xl">{t("planCompare.title")}</DialogTitle>
          <DialogDescription>{t("planCompare.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-6 py-5">
          <div
            className="grid grid-cols-1 gap-3 md:[grid-template-columns:repeat(var(--cols),minmax(240px,1fr))]"
            style={{ ["--cols" as string]: Math.max(colunas.length, 1) }}
          >
            {colunas.map(({ variant, kpis, steps }) => {
              const delta = ref && variant.id !== ref.variant.id ? deltaKPIs(ref.kpis, kpis) : null;
              const isRef = ref?.variant.id === variant.id;
              const gapOk = kpis.gapRendaEssencialAnual >= 0;
              return (
                <div
                  key={variant.id}
                  data-testid={`summary-col-${variant.name.slice(-1)}`}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-card p-4",
                    isRef ? "border-primary/50" : "border-border",
                  )}
                >
                  {/* header chip */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", DOT[variant.color])} />
                    <span className="font-heading text-sm font-semibold">{variant.name}</span>
                    {isRef && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {t("planCompare.refBadge")}
                      </span>
                    )}
                  </div>

                  {/* patrimônio na aposentadoria */}
                  <div>
                    <div className="text-[11px] text-muted-foreground">
                      {t("planCompare.wealthAt", { ano: kpis.anoAposentadoria })}
                    </div>
                    <div className="font-heading text-2xl font-bold tabular-nums text-foreground">
                      {fmt(kpis.patrimonioNaAposentadoria)}
                    </div>
                    {kpis.anoEsgotamento !== null && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-negative/10 px-2 py-0.5 text-[11px] font-semibold text-negative">
                        <TriangleAlert className="size-3" />
                        {t("planCompare.depletes", { ano: kpis.anoEsgotamento })}
                      </div>
                    )}
                    {delta && <div><Delta value={delta.patrimonioNaAposentadoria} format={fmt} /></div>}
                  </div>

                  {/* renda média */}
                  <div className="mt-4">
                    <div className="text-[11px] text-muted-foreground">{t("planCompare.avgIncome")}</div>
                    <div className="text-lg font-semibold tabular-nums">{cur(kpis.rendaMediaAposentadoriaMensal)}</div>
                    {delta && <Delta value={delta.rendaMediaAposentadoriaMensal} format={cur} />}
                  </div>

                  {/* gap essencial */}
                  <div className="mt-4">
                    <div className="text-[11px] text-muted-foreground">{t("planCompare.gap")}</div>
                    <div className={cn("text-lg font-semibold tabular-nums", gapOk ? "text-positive" : "text-negative")}>
                      {gapOk
                        ? t("planCompare.noGap")
                        : `−${t("planCompare.gapValue", { valor: fmt(Math.abs(kpis.gapRendaEssencialAnual)) })}`}
                    </div>
                    {delta && <Delta value={delta.gapRendaEssencialAnual} format={fmt} />}
                  </div>

                  {/* herança */}
                  <div className="mt-4">
                    <div className="text-[11px] text-muted-foreground">
                      {t("planCompare.estate", { ano: kpis.anoLongevidade })}
                    </div>
                    <div className="text-lg font-semibold tabular-nums">{fmt(kpis.herancaNaLongevidade)}</div>
                    {delta && <Delta value={delta.herancaNaLongevidade} format={fmt} />}
                  </div>

                  {/* próximos passos */}
                  <div className="mt-5 border-t border-border pt-3">
                    <div className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("planCompare.nextSteps")}
                    </div>
                    <ul className="space-y-1.5">
                      {steps.map((s, i) => {
                        const id = `${variant.id}-${i}`;
                        const checked = done.has(id);
                        return (
                          <li key={id}>
                            <button
                              type="button"
                              onClick={() =>
                                setDone((d) => {
                                  const n = new Set(d);
                                  if (n.has(id)) n.delete(id);
                                  else n.add(id);
                                  return n;
                                })
                              }
                              className="flex w-full items-start gap-2 text-left text-xs leading-snug"
                            >
                              <span
                                className={cn(
                                  "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border",
                                  checked ? "border-primary bg-primary text-primary-foreground" : "border-border",
                                )}
                              >
                                {checked && <Check className="size-2.5" />}
                              </span>
                              <span className={cn(checked && "text-muted-foreground line-through")}>
                                {t(`nextSteps.${s.key}`, s.params as Record<string, string | number>)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {(manual[variant.id] ?? []).map((txt, i) => (
                        <li key={`m-${i}`} className="flex items-start gap-2 text-xs leading-snug">
                          <span className="mt-0.5 size-3.5 shrink-0 rounded border border-border" />
                          {txt}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1.5">
                      <Input
                        value={draft[variant.id] ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [variant.id]: e.target.value }))}
                        placeholder={t("planCompare.stepPh")}
                        className="h-7 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          const txt = (draft[variant.id] ?? "").trim();
                          if (!txt) return;
                          setManual((m) => ({ ...m, [variant.id]: [...(m[variant.id] ?? []), txt] }));
                          setDraft((d) => ({ ...d, [variant.id]: "" }));
                        }}
                      >
                        <Plus className="size-3" />
                        {t("planCompare.addStep")}
                      </Button>
                    </div>
                  </div>

                  {!isRef && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="mt-3 self-start"
                      onClick={() => {
                        setVariantRef(variant.id);
                        setColunas((cols) =>
                          cols.map((c) => ({
                            ...c,
                            variant: { ...c.variant, isRef: c.variant.id === variant.id },
                          })),
                        );
                      }}
                    >
                      {t("planCompare.refBadge")} ←
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <span className="text-[10px] text-muted-foreground">{t("planCompare.illustrative")}</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
