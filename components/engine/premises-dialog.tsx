"use client";

import { useTranslations } from "next-intl";
import { Info, RotateCcw, SlidersHorizontal, TrendingUp, TriangleAlert } from "@/components/app/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  DEFAULT_PREMISES,
  getPremises,
  irrfEffectiveRate,
  type PremiseKey,
  type Premises,
} from "@/lib/premises";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Sample monthly income used for the live IRRF effective-rate preview. */
const IRRF_PREVIEW_BASE = 8000;

/** A single editable premise row: label, source caption, numeric field with unit. */
function Field({
  label,
  source,
  unit,
  value,
  def,
  step,
  badge,
  onChange,
}: {
  label: string;
  source?: string;
  unit: string;
  value: number;
  def: number;
  step: number;
  badge?: string;
  onChange: (n: number) => void;
}) {
  const t = useTranslations();
  const edited = Math.abs(value - def) > 1e-9;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
          {label}
          {badge && (
            <span className="rounded-full bg-warning-muted px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              {badge}
            </span>
          )}
          {edited && (
            <span className="rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-semibold text-info">
              {t("premises.adjusted")}
            </span>
          )}
        </div>
        {source && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{source}</div>}
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const n = parseFloat(e.target.value.replace(",", "."));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-24 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="w-12 text-left text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-info uppercase">
        <Icon className="size-3.5" />
        {title}
      </h3>
      <div className="divide-y divide-border/60">{children}</div>
    </section>
  );
}

export function PremisesDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const updatePremises = useVisionStore((s) => s.updatePremises);
  const resetPremises = useVisionStore((s) => s.resetPremises);
  const p = getPremises(plan);
  const d = DEFAULT_PREMISES;
  const set = (patch: Partial<Premises>) => updatePremises(patch);
  const src = (k: PremiseKey) => `${p.meta[k].label} · ${p.meta[k].year}`;
  const cur = (n: number) => formatCurrency(n, locale);

  const effective = irrfEffectiveRate(IRRF_PREVIEW_BASE, p);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2 font-heading text-lg">
            <SlidersHorizontal className="size-5 text-primary" />
            {t("premises.title")}
          </DialogTitle>
          <DialogDescription>{t("premises.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-muted/50 p-3 text-xs leading-snug text-foreground/80">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>{t("premises.disclaimer")}</span>
          </div>

          <Section icon={TrendingUp} title={t("premises.section.market")}>
            <Field
              label={t("premises.field.realReturn")}
              source={src("return")}
              unit={t("premises.unit.perYear")}
              value={p.realReturnRef}
              def={d.realReturnRef}
              step={0.25}
              onChange={(n) => set({ realReturnRef: n })}
            />
            <Field
              label={t("premises.field.inflation")}
              source={src("inflation")}
              unit={t("premises.unit.perYear")}
              value={p.inflationRef}
              def={d.inflationRef}
              step={0.25}
              onChange={(n) => set({ inflationRef: n })}
            />
          </Section>

          <Section icon={SlidersHorizontal} title={t("premises.section.horizon")}>
            <Field
              label={t("premises.field.horizonAge")}
              source={src("horizon")}
              unit={t("premises.unit.years")}
              value={p.planningHorizonAge}
              def={d.planningHorizonAge}
              step={1}
              onChange={(n) => set({ planningHorizonAge: Math.round(n) })}
            />
            <Field
              label={t("premises.field.longevityAge")}
              source={src("longevity")}
              unit={t("premises.unit.years")}
              value={p.longevityAge}
              def={d.longevityAge}
              step={1}
              onChange={(n) => set({ longevityAge: Math.round(n) })}
            />
          </Section>

          <Section icon={SlidersHorizontal} title={t("premises.section.protection")}>
            <Field
              label={t("premises.field.reserveMonths")}
              source={src("reserve")}
              unit={t("premises.unit.months")}
              value={p.emergencyReserveMonths}
              def={d.emergencyReserveMonths}
              step={1}
              onChange={(n) => set({ emergencyReserveMonths: Math.round(n) })}
            />
            <Field
              label={t("premises.field.successionPct")}
              source={src("succession")}
              unit={t("premises.unit.pct")}
              value={p.successionPctOfGross}
              def={d.successionPctOfGross}
              step={1}
              onChange={(n) => set({ successionPctOfGross: n })}
            />
          </Section>

          <Section icon={SlidersHorizontal} title={t("premises.section.inss")}>
            <Field
              label={t("premises.field.inssCeiling")}
              source={src("inss")}
              unit={t("premises.unit.perMonth")}
              value={p.inssCeiling}
              def={d.inssCeiling}
              step={1}
              onChange={(n) => set({ inssCeiling: n })}
            />
            <Field
              label={t("premises.field.inssRate")}
              badge={t("premises.heuristic")}
              unit={t("premises.unit.pct")}
              value={Math.round(p.inssReplacementRate * 100)}
              def={Math.round(d.inssReplacementRate * 100)}
              step={1}
              onChange={(n) => set({ inssReplacementRate: n / 100 })}
            />
          </Section>

          <Section icon={SlidersHorizontal} title={t("premises.section.irrf")}>
            <Field
              label={t("premises.field.irrfSimplified")}
              source={src("irrf")}
              unit={t("premises.unit.perMonth")}
              value={p.irrfSimplifiedDeduction}
              def={d.irrfSimplifiedDeduction}
              step={1}
              onChange={(n) => set({ irrfSimplifiedDeduction: n })}
            />
            <div className="pt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] tracking-wide text-muted-foreground/80 uppercase">
                    <th className="pb-1 font-medium">{t("premises.irrf.base")}</th>
                    <th className="pb-1 text-right font-medium">{t("premises.irrf.rate")}</th>
                    <th className="pb-1 text-right font-medium">{t("premises.irrf.deduct")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {p.irrfTable.map((b, i) => {
                    const prev = i > 0 ? p.irrfTable[i - 1].upTo : null;
                    const range =
                      b.upTo === null
                        ? t("premises.irrf.above", { v: cur(prev ?? 0) })
                        : prev === null
                          ? t("premises.irrf.upTo", { v: cur(b.upTo) })
                          : `${cur(prev)} – ${cur(b.upTo)}`;
                    return (
                      <tr key={i} className="border-t border-border/50">
                        <td className="py-1 text-foreground/80">{range}</td>
                        <td className="py-1 text-right text-foreground/80">
                          {b.rate === 0 ? t("premises.irrf.exempt") : formatPercent(b.rate, locale, 1)}
                        </td>
                        <td className="py-1 text-right text-foreground/80">{b.deduct > 0 ? cur(b.deduct) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="size-3.5 shrink-0 text-info" />
                {t("premises.irrf.preview", {
                  income: cur(IRRF_PREVIEW_BASE),
                  rate: formatPercent(effective, locale, 1),
                })}
              </div>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <Button variant="ghost" size="sm" onClick={resetPremises}>
            <RotateCcw className="size-4" />
            {t("premises.reset")}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t("premises.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
