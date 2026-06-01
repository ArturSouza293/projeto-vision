"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Columns3, Play, Plus, X } from "lucide-react";

import { Money } from "@/components/app/money";
import { IncomeNeedsChart } from "@/components/charts/income-needs-chart";
import { ProbabilityGauge } from "@/components/charts/probability-gauge";
import { WealthArea } from "@/components/charts/wealth-area";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
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
import { PLANNING_HORIZON_AGE, ageFromDob } from "@/lib/calc";
import { formatCurrency } from "@/lib/format";
import { GROWTH_SCENARIO_RETURNS, projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { GrowthScenario, Plan, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROWTH: GrowthScenario[] = [
  "base",
  "cautious",
  "conservative",
  "stressed",
  "custom",
];

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
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">{display}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function CompareDialog({ plan }: { plan: Plan }) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-heading">{t("scenarios.compare")}</DialogTitle>
      </DialogHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("common.name")}</th>
              <th className="py-2 px-3 font-medium">{t("scenarios.kpi.wealthAtRetirement")}</th>
              <th className="py-2 px-3 font-medium">{t("scenarios.kpi.probability")}</th>
              <th className="py-2 pl-3 font-medium">{t("scenarios.kpi.incomeGap")}</th>
            </tr>
          </thead>
          <tbody>
            {plan.scenarios.map((s) => {
              const r = projectPlan(plan, s.assumptions);
              return (
                <tr key={s.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-medium text-foreground">{s.name}</td>
                  <td className="py-2.5 px-3 tabular-nums">{formatCurrency(r.wealthAtRetirement, locale)}</td>
                  <td className="py-2.5 px-3 tabular-nums">{r.probabilityOfSuccess}%</td>
                  <td
                    className={cn(
                      "py-2.5 pl-3 tabular-nums",
                      r.incomeGap >= 0 ? "text-positive" : "text-negative",
                    )}
                  >
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

export function ScenariosStep() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan!);
  const addScenario = useVisionStore((s) => s.addScenario);
  const updateScenarioAssumptions = useVisionStore((s) => s.updateScenarioAssumptions);
  const selectScenario = useVisionStore((s) => s.selectScenario);
  const removeScenario = useVisionStore((s) => s.removeScenario);
  const runScenario = useVisionStore((s) => s.runScenario);
  const busy = useVisionStore((s) => s.busy);
  const [compareOpen, setCompareOpen] = useState(false);

  const scenarios = plan.scenarios;
  const selected =
    scenarios.find((s) => s.id === plan.selectedScenarioId) ?? scenarios[0];

  if (!selected) {
    return (
      <div>
        <StepHeader title={t("scenarios.title")} subtitle={t("scenarios.subtitle")} />
        <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
          <p className="text-sm text-muted-foreground">{t("scenarios.createFirst")}</p>
          <Button onClick={() => addScenario()}>
            <Plus className="size-4" />
            {t("scenarios.newScenario")}
          </Button>
        </div>
      </div>
    );
  }

  const a = selected.assumptions;
  const currentAge = ageFromDob(plan.clientProfile.dateOfBirth);
  const thisYear = new Date().getFullYear();
  const retirementYear = thisYear + (a.retirementAge - currentAge);
  const result = projectPlan(plan, a);
  const horizonYears = PLANNING_HORIZON_AGE - a.retirementAge;
  const lastsFull = result.retirementDurationYears >= horizonYears;
  const update = (patch: Partial<ScenarioAssumptions>) =>
    updateScenarioAssumptions(selected.id, patch);

  const goalsById = new Map(plan.goals.map((g) => [g.id, g]));

  return (
    <div>
      <StepHeader title={t("scenarios.title")} subtitle={t("scenarios.subtitle")} />

      {/* Scenario toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {scenarios.map((s) => {
          const active = s.id === selected.id;
          return (
            <span
              key={s.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary/5 text-foreground"
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
            </span>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => addScenario()}>
          <Plus className="size-4" />
          {t("scenarios.newScenario")}
        </Button>
        <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={scenarios.length < 2}>
              <Columns3 className="size-4" />
              {t("scenarios.compare")}
            </Button>
          </DialogTrigger>
          <CompareDialog plan={plan} />
        </Dialog>
      </div>

      {/* KPI tiles */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile
          label={t("scenarios.kpi.wealthAtRetirement")}
          tone="brand"
          value={<Money value={result.wealthAtRetirement} compact />}
        />
        <StatTile
          label={t("scenarios.kpi.retirementDuration")}
          value={`${result.retirementDurationYears} ${t("common.years")}`}
          hint={
            lastsFull
              ? t("scenarios.lastsToHorizon")
              : t("scenarios.depletesAt", { age: a.retirementAge + result.retirementDurationYears })
          }
        />
        <StatTile
          label={t("scenarios.kpi.probability")}
          tone={
            result.probabilityOfSuccess >= 70
              ? "positive"
              : result.probabilityOfSuccess >= 40
                ? "default"
                : "negative"
          }
          value={`${result.probabilityOfSuccess}%`}
        />
        <StatTile
          label={t("scenarios.kpi.estate")}
          value={<Money value={result.estateAtDeath} compact />}
        />
        <StatTile
          label={t("scenarios.kpi.incomeGap")}
          tone={result.incomeGap >= 0 ? "positive" : "negative"}
          value={<Money value={result.incomeGap} />}
          hint={t("common.perMonth")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              {t("scenarios.chart.wealthOverTime")}
            </h3>
            <WealthArea points={result.points} retirementYear={retirementYear} />
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">
              {t("scenarios.chart.incomeVsNeeds")}
            </h3>
            <IncomeNeedsChart points={result.points} />
          </section>
          {plan.goals.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("scenarios.chart.goalFunding")}
              </h3>
              <ul className="space-y-3">
                {result.goalFunding.map((gf) => {
                  const g = goalsById.get(gf.goalId);
                  if (!g) return null;
                  return (
                    <li key={gf.goalId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">{g.label ?? t(`goalType.${g.type}`)}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {t("goals.funded", { pct: gf.fundedPct })}
                        </span>
                      </div>
                      <Progress value={gf.fundedPct} className="h-1.5" />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Planning parameters */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              {t("scenarios.assumptions")}
            </h3>

            <div className="mb-5">
              <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("scenarios.growthScenario")}
              </div>
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
                    {t(`scenarios.growth.${g}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <ParamSlider
                label={t("scenarios.monthlyContribution")}
                value={a.monthlyContribution}
                display={formatCurrency(a.monthlyContribution, locale)}
                min={0}
                max={Math.min(100000, Math.max(20000, Math.ceil(a.monthlyContribution / 5000) * 10000))}
                step={100}
                onChange={(v) => update({ monthlyContribution: v })}
              />
              <ParamSlider
                label={t("scenarios.retirementAge")}
                value={a.retirementAge}
                display={`${a.retirementAge}`}
                min={Math.max(currentAge + 1, 45)}
                max={80}
                step={1}
                onChange={(v) => update({ retirementAge: v })}
              />
              <ParamSlider
                label={t("scenarios.expectedReturn")}
                value={a.expectedRealReturn}
                display={`IPCA+${a.expectedRealReturn}%`}
                min={0}
                max={12}
                step={0.25}
                onChange={(v) => update({ expectedRealReturn: v, growthScenario: "custom" })}
              />
              <ParamSlider
                label={t("scenarios.inflation")}
                value={a.inflation}
                display={`${a.inflation}%`}
                min={0}
                max={12}
                step={0.25}
                onChange={(v) => update({ inflation: v })}
              />
            </div>

            <Button
              className="mt-6 w-full"
              disabled={busy}
              onClick={() => runScenario(selected.id)}
            >
              <Play className="size-4" />
              {busy ? t("scenarios.running") : t("scenarios.run")}
            </Button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("scenarios.kpi.probability")}
            </div>
            <div className="grid place-items-center">
              <ProbabilityGauge value={result.probabilityOfSuccess} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
