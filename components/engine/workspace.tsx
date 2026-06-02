"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Columns3,
  Copy,
  PencilLine,
  Play,
  Plus,
  X,
} from "@/components/app/icons";

import { Money } from "@/components/app/money";
import { IncomeNeedsChart } from "@/components/charts/income-needs-chart";
import { ProbabilityGauge } from "@/components/charts/probability-gauge";
import { WealthArea } from "@/components/charts/wealth-area";
import { KpiTile } from "@/components/engine/kpi-tile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  PLANNING_HORIZON_AGE,
  ageFromDob,
  cashFlowTotals,
  netWorthTotals,
} from "@/lib/calc";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { GROWTH_SCENARIO_RETURNS, projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { GrowthScenario, Plan, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROWTH: GrowthScenario[] = ["base", "cautious", "conservative", "stressed", "custom"];

function ParamSlider({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">{display}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function CompareDialog({ plan }: { plan: Plan }) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-heading">{t("workspace.compare")}</DialogTitle>
      </DialogHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("common.name")}</th>
              <th className="px-3 py-2 font-medium">{t("kpi.wealthAtRetirement")}</th>
              <th className="px-3 py-2 font-medium">{t("kpi.probability")}</th>
              <th className="py-2 pl-3 font-medium">{t("kpi.incomeGap")}</th>
            </tr>
          </thead>
          <tbody>
            {plan.scenarios.map((s) => {
              const r = projectPlan(plan, s.assumptions);
              return (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatCurrency(r.wealthAtRetirement, locale)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.probabilityOfSuccess}%</td>
                  <td className={cn("py-2.5 pl-3 tabular-nums", r.incomeGap >= 0 ? "text-positive" : "text-negative")}>
                    {formatCurrency(r.incomeGap, locale)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DialogContent>
  );
}

export function Workspace() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan!);
  const addScenario = useVisionStore((s) => s.addScenario);
  const updateScenarioAssumptions = useVisionStore((s) => s.updateScenarioAssumptions);
  const selectScenario = useVisionStore((s) => s.selectScenario);
  const removeScenario = useVisionStore((s) => s.removeScenario);
  const runScenario = useVisionStore((s) => s.runScenario);
  const setDataTab = useVisionStore((s) => s.setDataTab);
  const busy = useVisionStore((s) => s.busy);
  const [compareOpen, setCompareOpen] = useState(false);

  const scenarios = plan.scenarios;
  const selected = scenarios.find((s) => s.id === plan.selectedScenarioId) ?? scenarios[0];

  if (!selected) {
    return (
      <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-card/30 p-20 text-center">
        <p className="text-muted-foreground">{t("workspace.createFirst")}</p>
        <Button size="lg" onClick={() => addScenario(t("workspace.scenarioName", { n: 1 }))}>
          <Plus className="size-4" />
          {t("workspace.newScenario")}
        </Button>
      </div>
    );
  }

  const a = selected.assumptions;
  const currentAge = ageFromDob(plan.clientProfile.dateOfBirth);
  const thisYear = new Date().getFullYear();
  const retirementYear = thisYear + (a.retirementAge - currentAge);
  const result = projectPlan(plan, a);
  const lastsFull = result.retirementDurationYears >= PLANNING_HORIZON_AGE - a.retirementAge;
  const update = (patch: Partial<ScenarioAssumptions>) => updateScenarioAssumptions(selected.id, patch);

  const cf = cashFlowTotals(plan.cashFlow);
  const nw = netWorthTotals(plan.netWorth);
  const goalsById = new Map(plan.goals.map((g) => [g.id, g]));

  const fmtCompact = (n: number) => formatCompactCurrency(n, locale);
  const fmtCurrency = (n: number) => formatCurrency(n, locale);

  function duplicate() {
    const id = addScenario(t("workspace.scenarioCopy", { name: selected!.name }));
    updateScenarioAssumptions(id, { ...selected!.assumptions });
  }

  return (
    <div className="space-y-6">
      {/* Scenario rail — the loop */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs tracking-wide text-muted-foreground/70 uppercase">
          {t("workspace.scenarios")}
        </span>
        {scenarios.map((s) => {
          const active = s.id === selected.id;
          return (
            <motion.span
              key={s.id}
              layout
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <button type="button" onClick={() => selectScenario(s.id)} className="font-medium">
                {s.name}
              </button>
              {scenarios.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeScenario(s.id)}
                  className="text-muted-foreground hover:text-negative"
                  aria-label={t("common.remove")}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </motion.span>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => addScenario(t("workspace.scenarioName", { n: scenarios.length + 1 }))}>
          <Plus className="size-4" />
          {t("workspace.newScenario")}
        </Button>
        <Button variant="ghost" size="sm" onClick={duplicate}>
          <Copy className="size-4" />
          {t("workspace.duplicate")}
        </Button>
        <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={scenarios.length < 2}>
              <Columns3 className="size-4" />
              {t("workspace.compare")}
            </Button>
          </DialogTrigger>
          <CompareDialog plan={plan} />
        </Dialog>
      </div>

      {/* KPI row — animated */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiTile label={t("kpi.wealthAtRetirement")} value={result.wealthAtRetirement} format={fmtCompact} tone="brand" />
        <KpiTile
          label={t("kpi.retirementDuration")}
          value={result.retirementDurationYears}
          format={(n) => `${Math.round(n)} ${t("common.years")}`}
          sublabel={lastsFull ? t("workspace.lastsToHorizon") : t("workspace.depletesAt", { age: a.retirementAge + result.retirementDurationYears })}
        />
        <KpiTile
          label={t("kpi.probability")}
          value={result.probabilityOfSuccess}
          format={(n) => `${Math.round(n)}%`}
          tone={result.probabilityOfSuccess >= 70 ? "positive" : result.probabilityOfSuccess >= 40 ? "default" : "negative"}
        />
        <KpiTile label={t("kpi.estate")} value={result.estateAtDeath} format={fmtCompact} />
        <KpiTile
          label={t("kpi.incomeGap")}
          value={result.incomeGap}
          format={fmtCurrency}
          tone={result.incomeGap >= 0 ? "positive" : "negative"}
          sublabel={t("common.perMonth")}
        />
      </div>

      {/* Charts + parameters */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="surface rounded-2xl p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">{t("chart.wealthOverTime")}</h3>
            <WealthArea points={result.points} retirementYear={retirementYear} />
          </section>
          <section className="surface rounded-2xl p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">{t("chart.incomeVsNeeds")}</h3>
            <IncomeNeedsChart points={result.points} />
          </section>
          {plan.goals.length > 0 && (
            <section className="surface rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("chart.goalFunding")}</h3>
              <ul className="space-y-3">
                {result.goalFunding.map((gf) => {
                  const g = goalsById.get(gf.goalId);
                  if (!g) return null;
                  return (
                    <li key={gf.goalId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{g.label ?? t(`goalType.${g.type}`)}</span>
                        <span className="text-muted-foreground tabular-nums">{t("goals.funded", { pct: gf.fundedPct })}</span>
                      </div>
                      <Progress value={gf.fundedPct} className="h-1.5" />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <section className="surface rounded-2xl p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">{t("workspace.parameters")}</h3>
            <div className="mb-5">
              <div className="mb-2 text-[11px] tracking-wide text-muted-foreground/80 uppercase">{t("workspace.growthScenario")}</div>
              <div className="flex flex-wrap gap-1.5">
                {GROWTH.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() =>
                      g === "custom"
                        ? update({ growthScenario: "custom" })
                        : update({ growthScenario: g, expectedRealReturn: GROWTH_SCENARIO_RETURNS[g] })
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      a.growthScenario === g
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`workspace.growth.${g}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <ParamSlider
                label={t("workspace.monthlyContribution")}
                value={a.monthlyContribution}
                display={formatCurrency(a.monthlyContribution, locale)}
                min={0}
                max={Math.max(0, Math.round(cf.surplus))}
                step={100}
                onChange={(v) => update({ monthlyContribution: v })}
              />
              <ParamSlider
                label={t("workspace.retirementAge")}
                value={a.retirementAge}
                display={`${a.retirementAge}`}
                min={Math.max(currentAge + 1, 45)}
                max={Math.max(
                  Math.max(currentAge + 1, 45),
                  Math.min(80, plan.clientProfile.retirementUsufructAge ?? 80),
                )}
                step={1}
                onChange={(v) => update({ retirementAge: v })}
              />
              <ParamSlider
                label={t("workspace.expectedReturn")}
                value={a.expectedRealReturn}
                display={`IPCA+${a.expectedRealReturn}%`}
                min={0}
                max={12}
                step={0.25}
                onChange={(v) => update({ expectedRealReturn: v, growthScenario: "custom" })}
              />
              <ParamSlider
                label={t("workspace.inflation")}
                value={a.inflation}
                display={`${a.inflation}%`}
                min={0}
                max={12}
                step={0.25}
                onChange={(v) => update({ inflation: v })}
              />
            </div>
            <Button className="mt-6 w-full glow-primary" disabled={busy} onClick={() => runScenario(selected.id)}>
              <Play className="size-4" />
              {busy ? t("workspace.running") : t("workspace.run")}
            </Button>
          </section>

          <section className="surface grid place-items-center rounded-2xl p-5">
            <div className="mb-2 text-center text-[11px] tracking-wide text-muted-foreground/80 uppercase">{t("kpi.probability")}</div>
            <ProbabilityGauge value={result.probabilityOfSuccess} />
          </section>

          <section className="surface rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("workspace.dossier")}</h3>
              <Button variant="ghost" size="xs" onClick={() => setDataTab("expense")}>
                <PencilLine className="size-3.5" />
                {t("workspace.editData")}
              </Button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("networth.netWorth")}</dt>
                <dd className="font-medium tabular-nums"><Money value={nw.netWorth} compact /></dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("cashflow.surplus")}</dt>
                <dd className={cn("font-medium tabular-nums", cf.surplus >= 0 ? "text-positive" : "text-negative")}>
                  <Money value={cf.surplus} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("suitability.result")}</dt>
                <dd className="font-medium">{plan.suitability.profile ? t(`riskProfile.${plan.suitability.profile}`) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("steps.goals")}</dt>
                <dd className="font-medium tabular-nums">{plan.goals.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
