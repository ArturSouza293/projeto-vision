"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, CircleCheckBig, ListChecks, RotateCcw } from "lucide-react";

import { Money } from "@/components/app/money";
import { StepHeader } from "@/components/journey/step-header";
import { StatTile } from "@/components/journey/stat-tile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PLANNING_HORIZON_AGE, ageFromDob } from "@/lib/calc";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";

const NEXT_STEPS = ["s1", "s2", "s3", "s4"] as const;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{children}</span>
    </div>
  );
}

export function ReviewStep() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan!);
  const approvePlan = useVisionStore((s) => s.approvePlan);
  const reopenPlan = useVisionStore((s) => s.reopenPlan);
  const setCurrentStep = useVisionStore((s) => s.setCurrentStep);

  const approved = plan.approvalStatus === "approved";
  const selected =
    plan.scenarios.find((s) => s.id === plan.selectedScenarioId) ?? plan.scenarios[0];

  if (!selected) {
    return (
      <div>
        <StepHeader title={t("review.title")} subtitle={t("review.subtitle")} />
        <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center">
          <p className="text-sm text-muted-foreground">{t("review.noScenario")}</p>
          <Button variant="outline" onClick={() => setCurrentStep("scenarios")}>
            {t("steps.scenarios")}
          </Button>
        </div>
      </div>
    );
  }

  const a = selected.assumptions;
  const result = projectPlan(plan, a);
  const p = plan.clientProfile;
  const age = ageFromDob(p.dateOfBirth);
  const horizonYears = PLANNING_HORIZON_AGE - a.retirementAge;
  const lastsFull = result.retirementDurationYears >= horizonYears;
  const goalsById = new Map(plan.goals.map((g) => [g.id, g]));

  return (
    <div>
      <StepHeader title={t("review.title")} subtitle={t("review.subtitle")} />

      {approved && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-positive/30 bg-positive-muted p-4">
          <CircleCheckBig className="size-5 shrink-0 text-positive" />
          <div className="flex-1">
            <div className="font-medium text-positive">{t("review.approved")}</div>
            <div className="text-sm text-muted-foreground">{t("review.approvedAt")}</div>
          </div>
          <Button variant="outline" size="sm" onClick={reopenPlan}>
            <RotateCcw className="size-4" />
            {t("review.reopen")}
          </Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("review.client")}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-heading text-xl font-semibold text-foreground">
                {p.partnerName ? `${p.firstName} & ${p.partnerName}` : `${p.firstName} ${p.lastName}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {t(`segment.${p.segment}`)} · {age} {t("common.years")}
                {p.city ? ` · ${p.city}` : ""}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("review.outcomes")}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label={t("scenarios.kpi.wealthAtRetirement")} tone="brand" value={<Money value={result.wealthAtRetirement} compact />} />
              <StatTile
                label={t("scenarios.kpi.probability")}
                tone={result.probabilityOfSuccess >= 70 ? "positive" : result.probabilityOfSuccess >= 40 ? "default" : "negative"}
                value={`${result.probabilityOfSuccess}%`}
              />
              <StatTile
                label={t("scenarios.kpi.retirementDuration")}
                value={`${result.retirementDurationYears} ${t("common.years")}`}
                hint={lastsFull ? t("scenarios.lastsToHorizon") : undefined}
              />
              <StatTile label={t("scenarios.kpi.incomeGap")} tone={result.incomeGap >= 0 ? "positive" : "negative"} value={<Money value={result.incomeGap} />} hint={t("common.perMonth")} />
            </div>
          </section>

          {plan.goals.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("scenarios.chart.goalFunding")}</h3>
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

          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ListChecks className="size-4 text-primary" />
              {t("review.nextSteps")}
            </h3>
            <ul className="space-y-2">
              {NEXT_STEPS.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t(`review.next.${s}`)}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t("review.assumptions")}</h3>
            <div className="text-xs text-muted-foreground">{t("review.selectedScenario")}: {selected.name}</div>
            <div className="mt-2">
              <Row label={t("scenarios.monthlyContribution")}><Money value={a.monthlyContribution} /></Row>
              <Row label={t("scenarios.retirementAge")}>{a.retirementAge}</Row>
              <Row label={t("scenarios.expectedReturn")}>{`IPCA+${a.expectedRealReturn}%`}</Row>
              <Row label={t("scenarios.inflation")}>{`${a.inflation}%`}</Row>
              <Row label={t("scenarios.growthScenario")}>{t(`scenarios.growth.${a.growthScenario}`)}</Row>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("approval.draft").length ? t(`approval.${plan.approvalStatus}`) : ""}
            </div>
            {!approved ? (
              <Button className="w-full" onClick={() => { approvePlan(); toast.success(t("review.approved")); }}>
                <Check className="size-4" />
                {t("review.approve")}
              </Button>
            ) : (
              <Button variant="outline" className="w-full" onClick={reopenPlan}>
                <RotateCcw className="size-4" />
                {t("review.reopen")}
              </Button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("review.downloadHint")}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
