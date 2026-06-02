/**
 * Cross-sell opportunity engine — derives ranked product opportunities from a
 * plan's signals, grounded in the Bradesco product map and the personas'
 * advisory moves. Deterministic and pure. Output keys resolve via i18n.
 */

import {
  cashFlowTotals,
  investableWealth,
  netWorthTotals,
} from "@/lib/calc";
import type { CrossSellOpportunity, Fit, Plan } from "@/lib/types";

const FIT_ORDER: Record<Fit, number> = { high: 0, medium: 1, low: 2 };

export function generateOpportunities(plan: Plan): CrossSellOpportunity[] {
  const cf = cashFlowTotals(plan.cashFlow);
  const nw = netWorthTotals(plan.netWorth);
  const investable = investableWealth(plan.netWorth);
  const p = plan.clientProfile;

  const monthlyExpense = cf.expense;
  const annualIncome = cf.income * 12;
  const soleProvider = !p.hasPartner && p.dependents > 0;
  const highRateBalance = plan.netWorth.liabilities
    .filter((l) => (l.annualRate ?? 0) >= 90)
    .reduce((s, l) => s + l.balance, 0);
  const mortgageBalance = plan.netWorth.liabilities
    .filter((l) => l.kind === "mortgage")
    .reduce((s, l) => s + l.balance, 0);
  const hasPension = nw.byClass.pension > 0;
  const isPJ =
    p.employmentStatus === "pj" ||
    p.employmentStatus === "self_employed" ||
    p.employmentStatus === "business_owner";
  const idleCash = Math.max(0, nw.byClass.cash - monthlyExpense * 6);
  const liquidGap = Math.max(0, monthlyExpense * 3 - nw.liquidAssets);
  const wealthy = p.segment === "principal" || p.segment === "private";
  const educationGoal = plan.goals.find((g) => g.type === "education");
  const propertyGoal = plan.goals.find((g) => g.type === "property");

  const out: CrossSellOpportunity[] = [];
  let i = 0;
  const add = (o: Omit<CrossSellOpportunity, "id">) =>
    out.push({ id: `op-${i++}`, ...o });

  if (cf.surplus < 0 || highRateBalance > 0) {
    add({
      productKey: "crosssell.product.debtRestructure",
      categoryKey: "crosssell.cat.credit",
      rationaleKey: "crosssell.why.highCostDebt",
      fit: "high",
      estimatedValue: Math.max(highRateBalance, monthlyExpense * 3),
    });
  }
  if (p.dependents >= 1) {
    add({
      productKey: "crosssell.product.lifeInsurance",
      categoryKey: "crosssell.cat.protection",
      rationaleKey: soleProvider ? "crosssell.why.soleProvider" : "crosssell.why.dependents",
      fit: soleProvider ? "high" : "medium",
      estimatedValue: Math.min(annualIncome * 10, 3_000_000),
    });
  }
  if (liquidGap > 0) {
    add({
      productKey: "crosssell.product.emergencyFund",
      categoryKey: "crosssell.cat.reserve",
      rationaleKey: "crosssell.why.reserveGap",
      fit: "high",
      estimatedValue: liquidGap,
    });
  }
  if (idleCash > 50_000 && nw.byClass.cash >= nw.byClass.investments) {
    add({
      productKey: "crosssell.product.cashMigration",
      categoryKey: "crosssell.cat.investments",
      rationaleKey: "crosssell.why.idleCash",
      fit: "high",
      estimatedValue: idleCash,
    });
  }
  if (!hasPension && (isPJ || annualIncome > 240_000)) {
    add({
      productKey: "crosssell.product.pension",
      categoryKey: "crosssell.cat.retirement",
      rationaleKey: isPJ ? "crosssell.why.noPensionPj" : "crosssell.why.pensionTopUp",
      fit: isPJ ? "high" : "medium",
      estimatedValue: Math.round(annualIncome * 0.12),
    });
  }
  if (educationGoal) {
    add({
      productKey: "crosssell.product.education",
      categoryKey: "crosssell.cat.goals",
      rationaleKey: "crosssell.why.educationGoal",
      fit: "high",
      estimatedValue: educationGoal.targetAmount,
    });
  }
  if (propertyGoal) {
    add({
      productKey: "crosssell.product.realEstate",
      categoryKey: "crosssell.cat.credit",
      rationaleKey: "crosssell.why.propertyGoal",
      fit: "medium",
      estimatedValue: propertyGoal.targetAmount,
    });
  }
  if (mortgageBalance > 0) {
    add({
      productKey: "crosssell.product.mortgageReview",
      categoryKey: "crosssell.cat.credit",
      rationaleKey: "crosssell.why.mortgage",
      fit: "medium",
      estimatedValue: mortgageBalance,
    });
  }
  if (wealthy && investable > 0) {
    add({
      productKey: "crosssell.product.offshore",
      categoryKey: "crosssell.cat.international",
      rationaleKey: "crosssell.why.offshore",
      fit: p.segment === "private" ? "high" : "medium",
      estimatedValue: Math.round(investable * 0.2),
    });
  }
  if (p.segment === "private") {
    add({
      productKey: "crosssell.product.succession",
      categoryKey: "crosssell.cat.wealth",
      rationaleKey: "crosssell.why.succession",
      fit: "high",
      estimatedValue: nw.netWorth,
    });
  }
  if (cf.surplus > 500) {
    add({
      productKey: "crosssell.product.autoInvest",
      categoryKey: "crosssell.cat.investments",
      rationaleKey: "crosssell.why.autoInvest",
      fit: "medium",
      estimatedValue: Math.round(cf.surplus * 12),
    });
  }

  return out
    .sort(
      (a, b) =>
        FIT_ORDER[a.fit] - FIT_ORDER[b.fit] || b.estimatedValue - a.estimatedValue,
    )
    .slice(0, 6);
}
