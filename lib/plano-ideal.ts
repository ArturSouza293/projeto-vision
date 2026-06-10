/**
 * "Plano Ideal" — the data plumbing for the one-click BIA optimizer.
 *
 * PRIVACY: buildPlanoIdealPayload returns ONLY anonymous numbers/booleans — no
 * name, CPF, e-mail or any identifier ever crosses the wire to the API.
 *
 * It also provides the front-side guardrails (clamp every model value to the
 * app's real slider limits) and a deterministic offline heuristic so the button
 * always produces a sensible plan even with no API key.
 */
import {
  ageFromDob,
  cashFlowTotals,
  clamp,
  continuingMonthlyIncome,
  essentialMonthlyExpenses,
  investableWealth,
  netWorthTotals,
  recurringMonthlyIncome,
  retirementMonthlyNeed,
} from "@/lib/calc";
import { getPremises } from "@/lib/premises";
import { returnCheckpoints } from "@/lib/plan";
import type { Plan, ScenarioAssumptions } from "@/lib/types";

/** The four scenario parameters the optimizer sets. */
export interface IdealParams {
  monthlyContribution: number;
  retirementAge: number;
  expectedRealReturn: number;
  inflation: number;
}

export interface IdealBounds {
  contribMax: number;
  retMin: number;
  retMax: number;
  returnMax: number;
}

/** The app's real limits for each parameter (used to clamp model output). */
export function idealBounds(plan: Plan): IdealBounds {
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  // The headline contribution shares the surplus with goal-specific contributions,
  // so the cap is the FREE surplus — otherwise the plan over-allocates.
  const goalContrib = plan.goals.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const retMin = Math.max(age + 1, 45);
  const usufruct = plan.clientProfile.retirementUsufructAge;
  const retMax = Math.max(retMin + 1, Math.min(80, usufruct && usufruct > retMin ? usufruct : 80));
  return { contribMax: Math.max(0, Math.round(cf.surplus - goalContrib)), retMin, retMax, returnMax: 12 };
}

const snap = (v: number, step: number) => Math.round(v / step) * step;

/** Clamp + snap raw model parameters to the app's sliders. */
export function clampParams(raw: Partial<IdealParams>, bounds: IdealBounds): IdealParams {
  return {
    monthlyContribution: clamp(snap(Number(raw.monthlyContribution) || 0, 100), 0, bounds.contribMax),
    retirementAge: Math.round(clamp(Number(raw.retirementAge) || bounds.retMin, bounds.retMin, bounds.retMax)),
    expectedRealReturn: clamp(snap(Number(raw.expectedRealReturn) || 0, 0.25), 0, bounds.returnMax),
    inflation: clamp(snap(Number(raw.inflation) || 0, 0.25), 0, 12),
  };
}

/** Anonymized, numbers-only payload sent to the API — nothing identifiable. */
export function buildPlanoIdealPayload(plan: Plan, a: ScenarioAssumptions) {
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const nw = netWorthTotals(plan.netWorth);
  const premises = getPremises(plan);
  const bounds = idealBounds(plan);
  const ri = plan.cashFlow.retirementIncome;
  return {
    currentAge: ageFromDob(plan.clientProfile.dateOfBirth),
    dependents: plan.clientProfile.dependents,
    cashFlow: {
      surplus: Math.round(cf.surplus),
      availableForContribution: bounds.contribMax, // surplus minus goal contributions
      recurringIncome: Math.round(recurringMonthlyIncome(plan.cashFlow)),
      essentialExpenses: Math.round(essentialMonthlyExpenses(plan.cashFlow)),
      retirementMonthlyNeed: Math.round(retirementMonthlyNeed(plan.cashFlow)),
      continuingMonthlyIncome: Math.round(continuingMonthlyIncome(plan.cashFlow, premises)),
      considersInss: ri?.inss ?? true,
    },
    netWorth: {
      investable: Math.round(investableWealth(plan.netWorth)),
      liquid: Math.round(nw.liquidAssets),
      totalAssets: Math.round(nw.totalAssets),
      pension: Math.round(nw.byClass.pension),
      lifeInsurance: Math.round(plan.clientProfile.lifeInsurance ?? 0),
    },
    goals: plan.goals.map((g) => ({
      id: g.id, // non-identifying — lets the BIA reference goals in its STRUCTURAL proposal
      type: g.type,
      target: Math.round(g.targetAmount),
      year: g.targetYear,
      current: Math.round(g.currentAmount),
      priority: g.priority,
    })),
    premises: {
      realReturnRefPct: premises.realReturnRef,
      inflationRefPct: premises.inflationRef,
      longevityAge: premises.longevityAge,
      emergencyReserveMonths: premises.emergencyReserveMonths,
      successionPctOfGross: premises.successionPctOfGross,
      inssCeiling: premises.inssCeiling,
    },
    bounds,
    current: {
      monthlyContribution: a.monthlyContribution,
      retirementAge: a.retirementAge,
      expectedRealReturn: a.expectedRealReturn,
      inflation: a.inflation,
    },
  };
}

/** Deterministic offline plan: full free surplus + the return that funds the goals. */
export function heuristicParams(plan: Plan, a: ScenarioAssumptions): IdealParams {
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const premises = getPremises(plan);
  const checkpoints = returnCheckpoints(plan, a);
  const targetReturn = checkpoints.full ?? checkpoints.p70 ?? premises.realReturnRef;
  return clampParams(
    {
      monthlyContribution: Math.max(0, Math.round(cf.surplus)),
      retirementAge: a.retirementAge,
      expectedRealReturn: targetReturn,
      inflation: premises.inflationRef,
    },
    idealBounds(plan),
  );
}
