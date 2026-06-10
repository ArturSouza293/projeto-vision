/**
 * v5 — comparação de planos (variantes A/B/C): KPIs do motor + próximos
 * passos derivados DETERMINISTICAMENTE por templates de regra (sem IA).
 */
import { summarize, type PlanSummaryKPIs } from "@/engine";
import { requestToInput } from "@/lib/api/planning-engine";
import { essentialMonthlyExpenses } from "@/lib/calc";
import { buildProjectionRequest, defaultAssumptions, projectPlan } from "@/lib/plan";
import type { Plan, ScenarioAssumptions } from "@/lib/types";

import { toEngineCase } from "./adapter";

/** The variant's live parameters: its selected scenario, else sane defaults. */
export function variantAssumptions(plan: Plan): ScenarioAssumptions {
  return (
    plan.scenarios.find((s) => s.id === plan.selectedScenarioId)?.assumptions ??
    plan.scenarios[0]?.assumptions ??
    defaultAssumptions(plan)
  );
}

/** Engine summary KPIs for a variant (same case mapping as the projection,
 *  enriched with the essencial/discricionária split the gap KPI needs). */
export function summarizePlan(plan: Plan): PlanSummaryKPIs {
  const a = variantAssumptions(plan);
  const input = requestToInput(buildProjectionRequest(plan, a));
  const c = toEngineCase(input);
  const essenciais = essentialMonthlyExpenses(plan.cashFlow);
  const total = plan.cashFlow.expenses.reduce((s, e) => s + e.monthly, 0);
  c.expenses = {
    itens: [
      { nome: "essenciais", valorMensal: essenciais, classe: "essencial" },
      { nome: "demais", valorMensal: Math.max(0, total - essenciais), classe: "discricionaria" },
    ],
  };
  return summarize(c);
}

/* ------------------------------------------------- próximos passos (regras) */

export interface NextStepItem {
  /** i18n key under `nextSteps.*`. */
  key: "inflow" | "recurringOutflow" | "gap" | "depletion" | "goalRisk" | "standard";
  params?: Record<string, string | number>;
}

/** Deterministic rule-template checklist derived from the variant's content. */
export function nextStepsFor(
  plan: Plan,
  kpis: PlanSummaryKPIs,
  resolveEventName: (presetKey: string, label?: string) => string,
  resolveGoalName: (goalId: string) => string,
  formatMoney: (n: number) => string,
): NextStepItem[] {
  const thisYear = new Date().getFullYear();
  const steps: NextStepItem[] = [];
  const events = plan.lifeEvents ?? [];

  for (const ev of events.filter((e) => e.kind === "inflow" && e.year >= thisYear).slice(0, 2)) {
    steps.push({
      key: "inflow",
      params: { nome: resolveEventName(ev.presetKey, ev.label), valor: formatMoney(ev.amount), ano: ev.year },
    });
  }
  for (const ev of events.filter((e) => e.kind === "outflow" && e.recurring && e.endYear).slice(0, 2)) {
    steps.push({
      key: "recurringOutflow",
      params: {
        nome: resolveEventName(ev.presetKey, ev.label),
        valor: formatMoney(ev.amount),
        ano1: ev.year,
        ano2: ev.endYear!,
      },
    });
  }
  if (kpis.gapRendaEssencialAnual < 0) steps.push({ key: "gap" });
  if (kpis.anoEsgotamento !== null) steps.push({ key: "depletion", params: { ano: kpis.anoEsgotamento } });

  const a = variantAssumptions(plan);
  const funding = projectPlan(plan, a).goalFunding;
  const byId = new Map(plan.goals.map((g) => [g.id, g]));
  for (const gf of funding.filter((g) => g.fundedPct < 90).slice(0, 2)) {
    if (byId.has(gf.goalId)) steps.push({ key: "goalRisk", params: { nome: resolveGoalName(gf.goalId) } });
  }

  steps.push({ key: "standard" }); // sempre presente
  return steps;
}
