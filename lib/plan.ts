/**
 * Plan orchestration helpers shared by the store, the FSC stub and the journey
 * steps: build an empty plan, score completeness, derive default scenario
 * assumptions, and translate a Plan into a projection request.
 */

import {
  ageFromDob,
  annuityFactor,
  cashFlowTotals,
  continuingMonthlyIncome,
  emergencyReserveTarget,
  goalFundedPct,
  investableWealth,
  project,
  retirementMonthlyNeed,
  successionTarget,
} from "@/lib/calc";
import { getPremises } from "@/lib/premises";
import { requestToInput, type ProjectionRequest } from "@/lib/api/planning-engine";
import type {
  Goal,
  GrowthScenario,
  Plan,
  ProjectionResult,
  ScenarioAssumptions,
  SuitabilityQuestion,
} from "@/lib/types";

/** Real-return preset (%) per growth scenario; `custom` uses the slider value. */
export const GROWTH_SCENARIO_RETURNS: Record<GrowthScenario, number> = {
  base: 5,
  cautious: 3.75,
  conservative: 2.5,
  stressed: 1.5,
  custom: 4,
};

/** Suitability questionnaire (Step 4). Option values run 0 = conservative .. 3 = aggressive. */
export const SUITABILITY_QUESTIONS: SuitabilityQuestion[] = [
  {
    id: "horizon",
    promptKey: "suitability.q.horizon.prompt",
    options: [
      { value: 0, labelKey: "suitability.q.horizon.o0" },
      { value: 1, labelKey: "suitability.q.horizon.o1" },
      { value: 2, labelKey: "suitability.q.horizon.o2" },
      { value: 3, labelKey: "suitability.q.horizon.o3" },
    ],
  },
  {
    id: "reaction",
    promptKey: "suitability.q.reaction.prompt",
    options: [
      { value: 0, labelKey: "suitability.q.reaction.o0" },
      { value: 1, labelKey: "suitability.q.reaction.o1" },
      { value: 2, labelKey: "suitability.q.reaction.o2" },
      { value: 3, labelKey: "suitability.q.reaction.o3" },
    ],
  },
  {
    id: "experience",
    promptKey: "suitability.q.experience.prompt",
    options: [
      { value: 0, labelKey: "suitability.q.experience.o0" },
      { value: 1, labelKey: "suitability.q.experience.o1" },
      { value: 2, labelKey: "suitability.q.experience.o2" },
      { value: 3, labelKey: "suitability.q.experience.o3" },
    ],
  },
  {
    id: "stability",
    promptKey: "suitability.q.stability.prompt",
    options: [
      { value: 0, labelKey: "suitability.q.stability.o0" },
      { value: 1, labelKey: "suitability.q.stability.o1" },
      { value: 2, labelKey: "suitability.q.stability.o2" },
      { value: 3, labelKey: "suitability.q.stability.o3" },
    ],
  },
  {
    id: "objective",
    promptKey: "suitability.q.objective.prompt",
    options: [
      { value: 0, labelKey: "suitability.q.objective.o0" },
      { value: 1, labelKey: "suitability.q.objective.o1" },
      { value: 2, labelKey: "suitability.q.objective.o2" },
      { value: 3, labelKey: "suitability.q.objective.o3" },
    ],
  },
];

/** Completeness of a plan across the seven journey checkpoints (0..100). */
export function planCompleteness(plan: Plan): number {
  const checks = [
    plan.clientProfile.firstName.trim().length > 0,
    plan.cashFlow.incomes.length > 0 || plan.cashFlow.expenses.length > 0,
    plan.netWorth.assets.length > 0 || plan.netWorth.liabilities.length > 0,
    plan.suitability.profile != null,
    plan.goals.length > 0,
    plan.scenarios.length > 0,
    plan.approvalStatus === "approved",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Sensible starting assumptions derived from the client's own numbers. */
export function defaultAssumptions(plan: Plan): ScenarioAssumptions {
  const { surplus } = cashFlowTotals(plan.cashFlow);
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const usufruct = plan.clientProfile.retirementUsufructAge;
  const retirementAge =
    usufruct && usufruct > age ? usufruct : age >= 60 ? Math.min(age + 5, 75) : 65;
  return {
    // Contribution is capped at the monthly cash-flow surplus.
    monthlyContribution: Math.max(0, Math.round(surplus)),
    retirementAge,
    expectedRealReturn: 4,
    inflation: 5,
    growthScenario: "custom",
  };
}

/**
 * Seed the three default goals (emergency reserve, retirement, succession),
 * pre-filled from the plan's own numbers. Used when a plan has no goals yet.
 */
export function defaultGoals(plan: Plan): Goal[] {
  const thisYear = new Date().getFullYear();
  const premises = getPremises(plan);
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const usufruct = plan.clientProfile.retirementUsufructAge ?? (age >= 60 ? age + 5 : 65);
  const retirementYear = thisYear + Math.max(1, usufruct - age);

  // Retirement capital: fund the monthly gap (need − continuing income) across the
  // longevity horizon, discounted by the real-return premise.
  const monthlyGap = Math.max(
    0,
    retirementMonthlyNeed(plan.cashFlow) - continuingMonthlyIncome(plan.cashFlow, premises),
  );
  const retirementCapital = Math.round(
    monthlyGap *
      12 *
      annuityFactor(Math.max(1, premises.longevityAge - usufruct), premises.realReturnRef / 100),
  );

  return [
    {
      id: "goal-emergency",
      type: "emergency_reserve",
      targetAmount: emergencyReserveTarget(plan.cashFlow, premises),
      targetYear: thisYear + 1,
      priority: "high",
      currentAmount: 0,
    },
    {
      id: "goal-retirement",
      type: "retirement",
      targetAmount: retirementCapital,
      targetYear: retirementYear,
      priority: "high",
      currentAmount: 0,
    },
    {
      id: "goal-succession",
      type: "legacy",
      targetAmount: successionTarget(plan.netWorth, premises),
      targetYear: thisYear + 20,
      priority: "medium",
      currentAmount: 0,
    },
  ];
}

/** Map a plan + scenario assumptions into a projection-engine request. */
export function buildProjectionRequest(
  plan: Plan,
  a: ScenarioAssumptions,
): ProjectionRequest {
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const premises = getPremises(plan);
  const { income } = cashFlowTotals(plan.cashFlow);
  return {
    currentAge: age,
    retirementAge: a.retirementAge,
    lifeExpectancy: premises.planningHorizonAge,
    investableNow: investableWealth(plan.netWorth),
    monthlyContribution: a.monthlyContribution,
    expectedRealReturn: a.expectedRealReturn,
    inflation: a.inflation,
    annualIncomeNow: income * 12,
    annualNeeds: retirementMonthlyNeed(plan.cashFlow) * 12,
    annualOtherIncome: continuingMonthlyIncome(plan.cashFlow, premises) * 12,
    goals: plan.goals,
  };
}

/** Synchronous projection for live slider feedback (same math as the engine). */
export function projectPlan(plan: Plan, a: ScenarioAssumptions): ProjectionResult {
  return project(requestToInput(buildProjectionRequest(plan, a)));
}

/**
 * Where the probability checkpoints land on the expected-return axis (%):
 * - `p70`: smallest real return where probability-of-success ≥ 70% (probabilistic band).
 * - `full`: smallest real return where the top-3 priority goals are 100% funded (deterministic).
 * Both via bisection over the slider range [0, 12]%. `null` when unreachable in range.
 */
export function returnCheckpoints(
  plan: Plan,
  a: ScenarioAssumptions,
): { p70: number | null; full: number | null } {
  const thisYear = new Date().getFullYear();
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const top = [...plan.goals]
    .sort((x, y) => (order[x.priority] ?? 1) - (order[y.priority] ?? 1))
    .slice(0, 3);

  const probAt = (rPct: number) =>
    projectPlan(plan, { ...a, expectedRealReturn: rPct, growthScenario: "custom" })
      .probabilityOfSuccess;
  const goalsFullAt = (rPct: number) =>
    top.length > 0 && top.every((g) => goalFundedPct(g, rPct / 100, thisYear) >= 99.5);

  // pred is monotonic non-decreasing in r → find the smallest r where it holds.
  const bisect = (pred: (r: number) => boolean): number | null => {
    if (pred(0)) return 0;
    if (!pred(12)) return null;
    let lo = 0;
    let hi = 12;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (pred(mid)) hi = mid;
      else lo = mid;
    }
    return Math.round(hi * 4) / 4; // snap to the 0.25 slider step
  };

  return { p70: bisect((r) => probAt(r) >= 70), full: bisect(goalsFullAt) };
}

/** A fresh, empty plan for a brand-new client. */
export function blankPlan(clientId: string): Plan {
  return {
    clientId,
    clientProfile: {
      id: clientId,
      firstName: "",
      lastName: "",
      dateOfBirth: "1985-01-01",
      gender: "undisclosed",
      maritalStatus: "single",
      dependents: 0,
      hasPartner: false,
      employmentStatus: "clt",
      taxResidency: "BR",
      pep: false,
      segment: "retail",
    },
    cashFlow: { incomes: [], expenses: [] },
    netWorth: { assets: [], liabilities: [] },
    suitability: { answers: {}, flags: [] },
    goals: [],
    scenarios: [],
    approvalStatus: "draft",
    events: [],
  };
}
