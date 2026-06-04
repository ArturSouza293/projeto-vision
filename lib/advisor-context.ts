/**
 * Compact plan snapshot fed to Bia (the advisor copilot) so she can explain the
 * numbers of the client currently on screen instead of answering in the abstract.
 */

import {
  ageFromDob,
  cashFlowTotals,
  emergencyReserveTarget,
  netWorthTotals,
} from "@/lib/calc";
import { formatCurrency } from "@/lib/format";
import { projectPlan } from "@/lib/plan";
import { getPremises } from "@/lib/premises";
import type { Locale, Plan } from "@/lib/types";

export function buildAdvisorContext(plan: Plan, locale: Locale): string {
  const p = plan.clientProfile;
  const premises = getPremises(plan);
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const nw = netWorthTotals(plan.netWorth);
  const reserve = emergencyReserveTarget(plan.cashFlow, premises);
  const cur = (n: number) => formatCurrency(n, locale);

  const lines: string[] = [
    `Client: ${`${p.firstName} ${p.lastName ?? ""}`.trim()}, age ${ageFromDob(p.dateOfBirth)}, segment ${p.segment}, ${p.dependents} dependents, marital ${p.maritalStatus}.`,
    `Monthly cash flow: income ${cur(cf.income)}, expenses ${cur(cf.expense)}, surplus ${cur(cf.surplus)}.`,
    `Net worth ${cur(nw.netWorth)} (assets ${cur(nw.totalAssets)}, liabilities ${cur(nw.totalLiabilities)}, liquid ${cur(nw.liquidAssets)}). Emergency-reserve target ${cur(reserve)} (${nw.liquidAssets >= reserve ? "funded" : "under-funded"}).`,
    `Premises: real return IPCA+${premises.realReturnRef}%, inflation ${premises.inflationRef}%, longevity ${premises.longevityAge}, INSS ceiling ${cur(premises.inssCeiling)}.`,
  ];

  const scn = plan.scenarios.find((s) => s.id === plan.selectedScenarioId) ?? plan.scenarios[0];
  if (scn) {
    const r = projectPlan(plan, scn.assumptions);
    lines.push(
      `Active scenario "${scn.name}": retire at ${scn.assumptions.retirementAge}, contribution ${cur(scn.assumptions.monthlyContribution)}/mo, return IPCA+${scn.assumptions.expectedRealReturn}%.`,
    );
    lines.push(
      `Projection: wealth at retirement ${cur(r.wealthAtRetirement)}, success probability ${r.probabilityOfSuccess}%, retirement income gap ${cur(r.incomeGap)}/mo, income lasts ~${Math.round(r.retirementDurationYears)} yrs, estate at horizon ${cur(r.estateAtDeath)}.`,
    );
    if (plan.goals.length > 0) {
      const funded = new Map(r.goalFunding.map((g) => [g.goalId, g.fundedPct]));
      lines.push(
        "Goals: " +
          plan.goals
            .map(
              (g) =>
                `${g.label || g.type} (target ${cur(g.targetAmount)} by ${g.targetYear}, ${funded.get(g.id) ?? 0}% funded)`,
            )
            .join("; ") +
          ".",
      );
    }
  }

  return lines.join("\n");
}
