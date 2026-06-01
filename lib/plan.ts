/**
 * Plan orchestration helpers shared by the store, the FSC stub and the journey
 * steps: build an empty plan, score completeness, derive default scenario
 * assumptions, and translate a Plan into a projection request.
 */

import {
  cashFlowTotals,
  investableWealth,
  monthlyContinuingIncome,
  monthlyNeedsBaseline,
  ageFromDob,
  project,
} from "@/lib/calc";
import { requestToInput, type ProjectionRequest } from "@/lib/api/planning-engine";
import type {
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
  const retirementAge = age >= 60 ? Math.min(age + 5, 75) : 65;
  return {
    monthlyContribution: Math.max(0, Math.round(surplus)),
    retirementAge,
    expectedRealReturn: 4,
    inflation: 5,
    growthScenario: "custom",
  };
}

/** Map a plan + scenario assumptions into a projection-engine request. */
export function buildProjectionRequest(
  plan: Plan,
  a: ScenarioAssumptions,
): ProjectionRequest {
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const { income } = cashFlowTotals(plan.cashFlow);
  return {
    currentAge: age,
    retirementAge: a.retirementAge,
    investableNow: investableWealth(plan.netWorth),
    monthlyContribution: a.monthlyContribution,
    expectedRealReturn: a.expectedRealReturn,
    inflation: a.inflation,
    annualIncomeNow: income * 12,
    annualNeeds: monthlyNeedsBaseline(plan.cashFlow) * 12,
    annualOtherIncome: monthlyContinuingIncome(plan.cashFlow) * 12,
    goals: plan.goals,
  };
}

/** Synchronous projection for live slider feedback (same math as the engine). */
export function projectPlan(plan: Plan, a: ScenarioAssumptions): ProjectionResult {
  return project(requestToInput(buildProjectionRequest(plan, a)));
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
