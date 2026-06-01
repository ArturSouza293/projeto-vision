import type { JourneyStepId, Plan } from "@/lib/types";

export const JOURNEY_STEPS: JourneyStepId[] = [
  "profile",
  "cashflow",
  "networth",
  "suitability",
  "goals",
  "scenarios",
  "review",
];

export function stepIndex(id: JourneyStepId): number {
  return JOURNEY_STEPS.indexOf(id);
}

export function nextStepId(id: JourneyStepId): JourneyStepId | null {
  return JOURNEY_STEPS[stepIndex(id) + 1] ?? null;
}

export function prevStepId(id: JourneyStepId): JourneyStepId | null {
  return JOURNEY_STEPS[stepIndex(id) - 1] ?? null;
}

/** Whether a step has enough data to count as visited/complete. */
export function stepDone(plan: Plan, id: JourneyStepId): boolean {
  switch (id) {
    case "profile":
      return plan.clientProfile.firstName.trim().length > 0;
    case "cashflow":
      return plan.cashFlow.incomes.length > 0 || plan.cashFlow.expenses.length > 0;
    case "networth":
      return (
        plan.netWorth.assets.length > 0 || plan.netWorth.liabilities.length > 0
      );
    case "suitability":
      return plan.suitability.profile != null;
    case "goals":
      return plan.goals.length > 0;
    case "scenarios":
      return plan.scenarios.length > 0;
    case "review":
      return plan.approvalStatus === "approved";
  }
}
