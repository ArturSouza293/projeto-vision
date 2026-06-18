"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  CircleCheckBig,
  Columns3,
  Copy,
  Lock,
  PencilLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "@/components/app/icons";

import { Money } from "@/components/app/money";
import { IncomeNeedsChart } from "@/components/charts/income-needs-chart";
import { ProbabilityGauge } from "@/components/charts/probability-gauge";
import { WealthTimeline } from "@/components/charts/wealth-timeline";
import { KpiTile } from "@/components/engine/kpi-tile";
import { KpiDetailDialog, type KpiModalKind } from "@/components/engine/kpi-detail-dialog";
import { PlanVariantsRail } from "@/components/engine/plan-variants-rail";
import { PremisesDialog } from "@/components/engine/premises-dialog";
import { PlanoIdealButton } from "@/components/engine/plano-ideal-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  achievableGoalCount,
  ageFromDob,
  cashFlowTotals,
  emergencyReserveTarget,
  netWorthTotals,
} from "@/lib/calc";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { getPremises } from "@/lib/premises";
import { GROWTH_SCENARIO_RETURNS, projectPlan, returnCheckpoints } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { GrowthScenario, Plan, ProjectionResult, ScenarioAssumptions } from "@/lib/types";
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
  marks,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  marks?: { value: number; label: string; tone: "info" | "primary" }[];
}) {
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">{display}</span>
      </div>
      <div className={cn("relative", marks && marks.length > 0 && "pt-5")}>
        {marks?.map((m, i) => {
          const p = pos(m.value);
          const edge = p < 8 ? "start" : p > 92 ? "end" : "center";
          return (
            <div
              key={i}
              className={cn(
                "pointer-events-none absolute top-0 z-10 flex flex-col",
                edge === "start"
                  ? "items-start"
                  : edge === "end"
                    ? "-translate-x-full items-end"
                    : "-translate-x-1/2 items-center",
              )}
              style={{ left: `${p}%` }}
            >
              <span
                className={cn(
                  "max-w-[5rem] truncate rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                  m.tone === "primary" ? "bg-primary/10 text-primary" : "bg-info/10 text-info",
                )}
              >
                {m.label}
              </span>
              <span
                className={cn("h-2 w-px", m.tone === "primary" ? "bg-primary/50" : "bg-info/50")}
              />
            </div>
          );
        })}
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      </div>
    </div>
  );
}

function CompareDialog({ plan }: { plan: Plan }) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const fmt = (n: number) => formatCompactCurrency(n, locale);
  const cur = (n: number) => formatCurrency(n, locale);
  const rows = plan.scenarios.map((s) => ({ s, r: projectPlan(plan, s.assumptions) }));
  type Row = (typeof rows)[number];
  const selectedId = plan.selectedScenarioId;

  const metrics: { label: string; value: (x: Row) => React.ReactNode }[] = [
    { label: t("workspace.monthlyContribution"), value: ({ s }) => cur(s.assumptions.monthlyContribution) },
    { label: t("workspace.retirementAge"), value: ({ s }) => s.assumptions.retirementAge },
    { label: t("workspace.expectedReturn"), value: ({ s }) => `IPCA+${s.assumptions.expectedRealReturn}%` },
    { label: t("kpi.wealthAtRetirement"), value: ({ r }) => fmt(r.wealthAtRetirement) },
    {
      label: t("kpi.probability"),
      value: ({ r }) => (
        <span
          className={cn(
            r.probabilityOfSuccess >= 70
              ? "text-positive"
              : r.probabilityOfSuccess >= 40
                ? ""
                : "text-negative",
          )}
        >
          {r.probabilityOfSuccess}%
        </span>
      ),
    },
    { label: t("kpi.retirementDuration"), value: ({ r }) => `${Math.round(r.retirementDurationYears)} ${t("common.years")}` },
    { label: t("kpi.objectives"), value: ({ r }) => `${achievableGoalCount(r.goalFunding)}/${plan.goals.length}` },
    { label: t("kpi.estate"), value: ({ r }) => fmt(r.estateAtDeath) },
    {
      label: t("kpi.incomeGap"),
      value: ({ r }) => (
        <span className={r.incomeGap >= 0 ? "text-positive" : "text-negative"}>{cur(r.incomeGap)}</span>
      ),
    },
  ];

  return (
    <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
      <DialogHeader className="border-b border-border px-5 pt-5 pb-4 text-left">
        <DialogTitle className="font-heading text-lg">{t("workspace.compareTitle")}</DialogTitle>
        <DialogDescription>{t("workspace.compareSubtitle")}</DialogDescription>
      </DialogHeader>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("workspace.compareEmpty")}</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-popover" />
                {rows.map(({ s }) => (
                  <th
                    key={s.id}
                    className={cn(
                      "sticky top-0 z-10 min-w-36 border-b border-border bg-popover px-4 py-3 text-left align-bottom font-heading text-sm font-semibold whitespace-nowrap",
                      s.id === selectedId ? "text-primary" : "text-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {s.id === selectedId && <span className="size-1.5 rounded-full bg-primary" />}
                      {s.name}
                    </span>
                    {s.id === selectedId && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {t("workspace.selected")}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={i}>
                  <td className="sticky left-0 z-10 border-b border-border/50 bg-popover py-2.5 pr-4 pl-5 text-xs whitespace-nowrap text-muted-foreground">
                    {m.label}
                  </td>
                  {rows.map((row) => (
                    <td
                      key={row.s.id}
                      className={cn(
                        "border-b border-border/50 px-4 py-2.5 font-medium tabular-nums whitespace-nowrap",
                        row.s.id === selectedId ? "bg-primary/[0.04] text-foreground" : "text-foreground/90",
                      )}
                    >
                      {m.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const ensureBaseScenario = useVisionStore((s) => s.ensureBaseScenario);
  const setDataTab = useVisionStore((s) => s.setDataTab);
  const [compareOpen, setCompareOpen] = useState(false);
  const [premisesOpen, setPremisesOpen] = useState(false);
  const [kpiModal, setKpiModal] = useState<KpiModalKind | null>(null);
  const [dynamic, setDynamic] = useState(true);
  const [frozen, setFrozen] = useState<ProjectionResult | null>(null);

  const scenarios = plan.scenarios;
  const selected = scenarios.find((s) => s.id === plan.selectedScenarioId) ?? scenarios[0];

  // Open a base scenario automatically once there's data to plan with — the
  // engine is dynamic, so the advisor lands straight in the live simulation
  // after the cadastro instead of having to click "create scenario".
  useEffect(() => {
    ensureBaseScenario(t("workspace.scenarioBase"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios.length, plan.clientId, plan.cashFlow.incomes.length, plan.netWorth.assets.length]);

  if (!selected) {
    return (
      <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-card/30 p-16 text-center">
        <p className="text-sm text-muted-foreground">{t("workspace.preparing")}</p>
      </div>
    );
  }

  const a = selected.assumptions;
  const premises = getPremises(plan);
  const currentAge = ageFromDob(plan.clientProfile.dateOfBirth);
  const thisYear = new Date().getFullYear();
  // Retirement-age slider bounds (also used for the timeline anchor + marker).
  // An invalid usufruct (≤ current age) must NOT collapse the slider.
  const retMin = Math.max(currentAge + 1, 45);
  const usufruct = plan.clientProfile.retirementUsufructAge;
  const retMax = Math.max(retMin + 1, Math.min(80, usufruct && usufruct > retMin ? usufruct : 80));
  const retAge = Math.min(Math.max(a.retirementAge, retMin), retMax);
  const retirementYear = thisYear + (retAge - currentAge);
  const liveResult = projectPlan(plan, a);
  const result = dynamic ? liveResult : (frozen ?? liveResult);
  const lastsFull = result.retirementDurationYears >= premises.planningHorizonAge - a.retirementAge;
  const update = (patch: Partial<ScenarioAssumptions>) => updateScenarioAssumptions(selected.id, patch);
  const freezeNow = () => setFrozen(liveResult);

  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const nw = netWorthTotals(plan.netWorth);
  const reserveFloor = emergencyReserveTarget(plan.cashFlow, premises);
  const reserveShort = Math.max(0, reserveFloor - nw.liquidAssets);
  const reserveFunded = reserveShort <= 0;
  const goalContributions = plan.goals.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);
  const allocated = a.monthlyContribution + goalContributions;
  const freeBalance = cf.surplus - allocated;
  const deficit = cf.surplus < 0;
  const overAllocated = !deficit && allocated > 0 && freeBalance < 0;
  const goalsById = new Map(plan.goals.map((g) => [g.id, g]));

  const checkpoints = returnCheckpoints(plan, a);
  const returnMarks = [
    checkpoints.p70 != null
      ? { value: checkpoints.p70, label: t("workspace.checkpoint70"), tone: "info" as const }
      : null,
    checkpoints.full != null
      ? { value: checkpoints.full, label: t("workspace.checkpoint100"), tone: "primary" as const }
      : null,
  ].filter((m): m is { value: number; label: string; tone: "info" | "primary" } => m != null);

  const fmtCompact = (n: number) => formatCompactCurrency(n, locale);
  const fmtCurrency = (n: number) => formatCurrency(n, locale);

  function duplicate() {
    const id = addScenario(t("workspace.scenarioCopy", { name: selected!.name }));
    updateScenarioAssumptions(id, { ...selected!.assumptions });
  }

  return (
    <div className="space-y-6">
      {/* Client header — who we're planning for */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-border bg-card/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {`${plan.clientProfile.firstName} ${plan.clientProfile.lastName ?? ""}`.trim() || t("welcome.home")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {currentAge} {t("common.years")} · {t(`segment.${plan.clientProfile.segment}`)}
          </p>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t("networth.netWorth")}</dt>
            <dd className="font-semibold tabular-nums"><Money value={nw.netWorth} compact /></dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t("cashflow.surplus")}</dt>
            <dd className={cn("font-semibold tabular-nums", cf.surplus >= 0 ? "text-positive" : "text-negative")}>
              <Money value={cf.surplus} />
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">{t("suitability.result")}</dt>
            <dd className="font-semibold">{plan.suitability.profile ? t(`riskProfile.${plan.suitability.profile}`) : "—"}</dd>
          </div>
        </dl>
      </div>

      {/* v5: Plan variants (A/B/C) — full-case copies for side-by-side comparison */}
      <PlanVariantsRail />

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
                  className="grid size-6 -m-1 place-items-center text-muted-foreground hover:text-negative"
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiTile label={t("kpi.wealthAtRetirement")} value={result.wealthAtRetirement} format={fmtCompact} tone="brand" onClick={() => setKpiModal("wealth")} />
        <KpiTile
          label={t("kpi.retirementDuration")}
          value={result.retirementDurationYears}
          format={(n) => `${Math.round(n)} ${t("common.years")}`}
          sublabel={lastsFull ? t("workspace.lastsToHorizon") : t("workspace.depletesAt", { age: a.retirementAge + result.retirementDurationYears })}
          onClick={() => setKpiModal("duration")}
        />
        <KpiTile
          label={t("kpi.probability")}
          value={result.probabilityOfSuccess}
          format={(n) => `${Math.round(n)}%`}
          tone={result.probabilityOfSuccess >= 70 ? "positive" : result.probabilityOfSuccess >= 40 ? "default" : "negative"}
          onClick={() => setKpiModal("probability")}
        />
        <KpiTile label={t("kpi.estate")} value={result.estateAtDeath} format={fmtCompact} onClick={() => setKpiModal("estate")} />
        <KpiTile
          label={t("kpi.incomeGap")}
          value={result.incomeGap}
          format={fmtCurrency}
          tone={result.incomeGap >= 0 ? "positive" : "negative"}
          sublabel={t("common.perMonth")}
          onClick={() => setKpiModal("gap")}
        />
        <KpiTile
          label={t("kpi.objectives")}
          value={achievableGoalCount(result.goalFunding)}
          format={(n) => `${Math.round(n)}/${plan.goals.length}`}
          tone={plan.goals.length > 0 && achievableGoalCount(result.goalFunding) === plan.goals.length ? "positive" : "default"}
          sublabel={t("kpi.achievable")}
          onClick={() => setKpiModal("goals")}
        />
      </div>

      <KpiDetailDialog
        kind={kpiModal}
        onOpenChange={(open) => {
          if (!open) setKpiModal(null);
        }}
        plan={plan}
        result={result}
        assumptions={a}
      />

      <PremisesDialog open={premisesOpen} onOpenChange={setPremisesOpen} plan={plan} />

      {/* Charts + parameters */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <section className="surface rounded-2xl p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">{t("chart.wealthOverTime")}</h3>
            <WealthTimeline
              plan={plan}
              assumptions={a}
              scenarioId={selected.id}
              points={result.points}
              retirementYear={retirementYear}
              currentAge={currentAge}
              retMin={retMin}
              retMax={retMax}
            />
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
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="text-foreground">{g.label ?? t(`goalType.${g.type}`)}</span>
                        {gf.fundedPct >= 100 ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-positive-muted px-2 py-0.5 text-[11px] font-semibold text-positive">
                            <CircleCheckBig className="size-3" />
                            {t("goals.achieved")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground tabular-nums">{t("goals.funded", { pct: gf.fundedPct })}</span>
                        )}
                      </div>
                      <Progress value={gf.fundedPct} className="h-1.5" />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="surface rounded-2xl p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{t("workspace.parameters")}</h3>
              <Button variant="ghost" size="xs" onClick={() => setPremisesOpen(true)}>
                <SlidersHorizontal className="size-3.5" />
                {t("premises.open")}
              </Button>
            </div>
            <p className="mb-4 text-[11px] leading-snug text-muted-foreground">
              {t("premises.summary", {
                inss: fmtCurrency(premises.inssCeiling),
                longevity: premises.longevityAge,
                reserve: premises.emergencyReserveMonths,
              })}
            </p>
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
              <div>
                <ParamSlider
                  label={t("workspace.monthlyContribution")}
                  value={a.monthlyContribution}
                  display={formatCurrency(a.monthlyContribution, locale)}
                  min={0}
                  max={Math.max(0, Math.round(cf.surplus))}
                  step={100}
                  onChange={(v) => update({ monthlyContribution: v })}
                />
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("workspace.freeBalance")}</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      overAllocated || deficit ? "text-negative" : freeBalance > 0 ? "text-positive" : "text-muted-foreground",
                    )}
                  >
                    {fmtCurrency(freeBalance)}
                  </span>
                </div>
              </div>
              <ParamSlider
                label={t("workspace.retirementAge")}
                value={retAge}
                display={`${retAge}`}
                min={retMin}
                max={retMax}
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
                marks={returnMarks}
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

            <div className="mt-5">
              <PlanoIdealButton plan={plan} assumptions={a} scenarioId={selected.id} />
            </div>
            {(deficit || overAllocated) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-negative/30 bg-negative/5 p-2.5 text-xs leading-snug text-negative">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {deficit
                    ? t("workspace.deficit", { amount: fmtCurrency(-cf.surplus) })
                    : t("workspace.overAllocated", { alloc: fmtCurrency(allocated), surplus: fmtCurrency(cf.surplus) })}
                </span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
                  <Switch
                    checked={dynamic}
                    onCheckedChange={(v) => {
                      if (!v) freezeNow();
                      setDynamic(v);
                    }}
                  />
                  {t("workspace.dynamicMode")}
                </label>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  {dynamic ? t("workspace.dynamicOn") : t("workspace.dynamicOff")}
                </p>
              </div>
              {!dynamic && (
                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={freezeNow}>
                  <RotateCcw className="size-3.5" />
                  {t("workspace.recompute")}
                </Button>
              )}
            </div>
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
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Lock className="size-3.5 text-info" />
                  {t("premises.reserveFloor")}
                </dt>
                <dd className="text-right">
                  <div className="font-medium tabular-nums"><Money value={reserveFloor} compact /></div>
                  <div className={cn("text-[10px] font-semibold", reserveFunded ? "text-positive" : "text-warning")}>
                    {reserveFunded
                      ? t("workspace.reserveFunded")
                      : t("workspace.reserveShort", { amount: fmtCompact(reserveShort) })}
                  </div>
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
