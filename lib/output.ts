/**
 * Builds the outbound payload the engine sends back to the bank's Salesforce
 * after approval: approved plan + projection + cross-sell + generated data.
 */

import { cashFlowTotals, goalFundedPct, netWorthTotals } from "@/lib/calc";
import { projectPlan } from "@/lib/plan";
import type {
  CrossSellOpportunity,
  OutputPayload,
  Plan,
  Scenario,
} from "@/lib/types";

export const ENGINE_VERSION = "vision-sim/0.2";

export function buildOutputPayload(args: {
  plan: Plan;
  scenario: Scenario | undefined;
  opportunities: CrossSellOpportunity[];
  resolve: (key: string) => string;
  now: string;
}): OutputPayload {
  const { plan, scenario, opportunities, resolve, now } = args;
  const cf = cashFlowTotals(plan.cashFlow);
  const nw = netWorthTotals(plan.netWorth);
  const result = scenario ? projectPlan(plan, scenario.assumptions) : null;
  const realReturn = (scenario?.assumptions.expectedRealReturn ?? 4) / 100;

  return {
    meta: {
      generatedAt: now,
      engineVersion: ENGINE_VERSION,
      status: plan.approvalStatus,
    },
    client: {
      id: plan.clientId,
      name: `${plan.clientProfile.firstName} ${plan.clientProfile.lastName}`.trim(),
      segment: plan.clientProfile.segment,
    },
    riskProfile: plan.suitability.profile ?? null,
    approvedScenario: scenario
      ? { id: scenario.id, name: scenario.name, assumptions: scenario.assumptions }
      : null,
    projection: result
      ? {
          wealthAtRetirement: result.wealthAtRetirement,
          retirementDurationYears: result.retirementDurationYears,
          probabilityOfSuccess: result.probabilityOfSuccess,
          estateAtDeath: result.estateAtDeath,
          incomeGap: result.incomeGap,
        }
      : null,
    balanceSheet: { netWorth: nw.netWorth, liquidAssets: nw.liquidAssets },
    cashFlow: {
      surplus: cf.surplus,
      savingsRate: Math.round(cf.savingsRate * 1000) / 1000,
    },
    goals: plan.goals.map((g) => ({
      type: g.type,
      targetAmount: g.targetAmount,
      targetYear: g.targetYear,
      fundedPct: Math.round(goalFundedPct(g, realReturn)),
    })),
    crossSell: opportunities.map((o) => ({
      product: resolve(o.productKey),
      category: resolve(o.categoryKey),
      fit: o.fit,
      score: o.score,
      estimatedValue: o.estimatedValue,
      rationale: resolve(o.rationaleKey),
    })),
  };
}
