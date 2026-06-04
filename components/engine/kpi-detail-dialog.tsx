"use client";

import { useTranslations } from "next-intl";

import { Money } from "@/components/app/money";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  continuingMonthlyIncome,
  investableWealth,
  retirementMonthlyNeed,
} from "@/lib/calc";
import { getPremises } from "@/lib/premises";
import { GOAL_COLOR, GOAL_ICON } from "@/lib/goal-meta";
import type { Plan, ProjectionResult, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

export type KpiModalKind =
  | "wealth"
  | "duration"
  | "probability"
  | "estate"
  | "gap"
  | "goals";

const ACHIEVABLE = 90;

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-0.5 font-heading text-base font-semibold text-foreground tabular-nums">
        {children}
      </div>
    </div>
  );
}

export function KpiDetailDialog({
  kind,
  onOpenChange,
  plan,
  result,
  assumptions,
}: {
  kind: KpiModalKind | null;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
  result: ProjectionResult;
  assumptions: ScenarioAssumptions;
}) {
  const t = useTranslations();
  const goalsById = new Map(plan.goals.map((g) => [g.id, g]));
  const thisYear = new Date().getFullYear();
  const achievable = result.goalFunding.filter((g) => g.fundedPct >= ACHIEVABLE).length;

  const figures: { label: string; value: React.ReactNode }[] =
    kind === "wealth"
      ? [
          { label: t("kpiDetail.f.investableNow"), value: <Money value={investableWealth(plan.netWorth)} compact /> },
          { label: t("workspace.monthlyContribution"), value: <Money value={assumptions.monthlyContribution} compact /> },
          { label: t("workspace.retirementAge"), value: assumptions.retirementAge },
          { label: t("kpi.wealthAtRetirement"), value: <Money value={result.wealthAtRetirement} compact /> },
        ]
      : kind === "duration"
        ? [
            { label: t("kpi.retirementDuration"), value: `${Math.round(result.retirementDurationYears)} ${t("common.years")}` },
            { label: t("workspace.retirementAge"), value: assumptions.retirementAge },
          ]
        : kind === "probability"
          ? [
              { label: t("kpi.probability"), value: `${result.probabilityOfSuccess}%` },
              { label: t("kpi.wealthAtRetirement"), value: <Money value={result.wealthAtRetirement} compact /> },
            ]
          : kind === "estate"
            ? [
                { label: t("kpi.estate"), value: <Money value={result.estateAtDeath} compact /> },
                { label: t("workspace.retirementAge"), value: assumptions.retirementAge },
              ]
            : kind === "gap"
              ? [
                  { label: t("kpiDetail.f.need"), value: <Money value={Math.round(retirementMonthlyNeed(plan.cashFlow))} compact /> },
                  { label: t("kpiDetail.f.continuing"), value: <Money value={Math.round(continuingMonthlyIncome(plan.cashFlow, getPremises(plan)))} compact /> },
                  { label: t("kpi.incomeGap"), value: <Money value={result.incomeGap} /> },
                ]
              : [];

  return (
    <Dialog open={kind != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-lg">
        {kind && (
          <>
            <DialogHeader className="text-left">
              <DialogTitle className="font-heading">{t(`kpiDetail.${kind}.title`)}</DialogTitle>
              <DialogDescription>{t(`kpiDetail.${kind}.body`)}</DialogDescription>
            </DialogHeader>

            {kind === "goals" ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                  <span className="font-heading text-lg font-semibold text-foreground tabular-nums">
                    {achievable}/{plan.goals.length}
                  </span>{" "}
                  <span className="text-muted-foreground">{t("kpiDetail.goals.achievable")}</span>
                </div>
                {plan.goals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("goals.empty")}</p>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {result.goalFunding.map((gf) => {
                      const g = goalsById.get(gf.goalId);
                      if (!g) return null;
                      const Icon = GOAL_ICON[g.type];
                      const ok = gf.fundedPct >= ACHIEVABLE;
                      return (
                        <AccordionItem
                          key={gf.goalId}
                          value={gf.goalId}
                          className="rounded-xl border border-border px-3 last:border-b"
                        >
                          <AccordionTrigger className="py-3 hover:no-underline">
                            <span className="flex flex-1 items-center gap-3 pr-2 text-left">
                              <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", GOAL_COLOR[g.type])}>
                                <Icon className="size-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {g.label || t(`goalType.${g.type}`)}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {t("goals.horizon", { years: Math.max(0, g.targetYear - thisYear) })}
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                                  ok ? "bg-positive-muted text-positive" : "bg-warning-muted text-warning",
                                )}
                              >
                                {gf.fundedPct}% · {ok ? t("kpiDetail.goals.ok") : t("kpiDetail.goals.partial")}
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pb-3">
                            <p className="text-sm text-muted-foreground">{t(`goalDescription.${g.type}`)}</p>
                            <Progress value={gf.fundedPct} className="h-1.5" />
                            <div className="grid grid-cols-2 gap-2">
                              <Stat label={t("goals.targetAmount")}><Money value={g.targetAmount} compact /></Stat>
                              <Stat label={t("goals.targetYear")}>{g.targetYear}</Stat>
                              <Stat label={t("goals.currentAmount")}><Money value={g.currentAmount} compact /></Stat>
                              <Stat label={t("goals.monthlyContribution")}><Money value={g.monthlyContribution ?? 0} compact /></Stat>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {figures.map((f, i) => (
                  <Stat key={i} label={f.label}>
                    {f.value}
                  </Stat>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
