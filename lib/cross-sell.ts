/**
 * Cross-sell opportunity engine — derives ranked product opportunities from a
 * plan's signals, grounded in the Bradesco product map and the personas'
 * advisory moves. Deterministic and pure; output keys resolve via i18n.
 *
 * Each opportunity gets a 0..100 fit score (tier base + a log boost on the BRL
 * signal); results are de-duplicated by product and ranked by score.
 */

import {
  ageFromDob,
  cashFlowTotals,
  investableWealth,
  netWorthTotals,
} from "@/lib/calc";
import type { CrossSellOpportunity, Fit, Plan } from "@/lib/types";

const FIT_BASE: Record<Fit, number> = { high: 70, medium: 50, low: 32 };

function scoreFor(fit: Fit, estimatedValue: number): number {
  const boost = Math.min(26, Math.round(Math.log10(Math.max(1, estimatedValue)) * 4));
  return Math.min(99, FIT_BASE[fit] + boost);
}

export function generateOpportunities(plan: Plan): CrossSellOpportunity[] {
  const cf = cashFlowTotals(plan.cashFlow);
  const nw = netWorthTotals(plan.netWorth);
  const investable = investableWealth(plan.netWorth);
  const p = plan.clientProfile;
  const age = ageFromDob(p.dateOfBirth);
  const thisYear = new Date().getFullYear();

  const monthlyExpense = cf.expense;
  const annualIncome = cf.income * 12;
  const soleProvider = !p.hasPartner && p.dependents > 0;
  const highRateBalance = plan.netWorth.liabilities
    .filter((l) => (l.annualRate ?? 0) >= 90)
    .reduce((s, l) => s + l.balance, 0);
  const mortgageBalance = plan.netWorth.liabilities
    .filter((l) => l.kind === "mortgage")
    .reduce((s, l) => s + l.balance, 0);
  const healthMonthly = plan.cashFlow.expenses
    .filter((e) => e.category === "health")
    .reduce((s, e) => s + e.monthly, 0);
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
  const retirementGoal = plan.goals.find((g) => g.type === "retirement");
  const nearRetirement =
    age >= 54 || (retirementGoal ? retirementGoal.targetYear - thisYear <= 8 : false);

  const out: CrossSellOpportunity[] = [];
  let i = 0;
  const add = (
    fit: Fit,
    productKey: string,
    categoryKey: string,
    rationaleKey: string,
    estimatedValue: number,
  ) =>
    out.push({
      id: `op-${i++}`,
      productKey,
      categoryKey,
      rationaleKey,
      fit,
      estimatedValue,
      score: scoreFor(fit, estimatedValue),
    });

  if (cf.surplus < 0 || highRateBalance > 0) {
    add("high", "crosssell.product.debtRestructure", "crosssell.cat.credit", "crosssell.why.highCostDebt", Math.max(highRateBalance, monthlyExpense * 3));
  }
  if (p.dependents >= 1) {
    add(soleProvider ? "high" : "medium", "crosssell.product.lifeInsurance", "crosssell.cat.protection", soleProvider ? "crosssell.why.soleProvider" : "crosssell.why.dependents", Math.min(annualIncome * 10, 3_000_000));
  }
  if (healthMonthly >= 2000 && p.dependents >= 1) {
    add("high", "crosssell.product.medicalFund", "crosssell.cat.protection", "crosssell.why.medicalContinuity", Math.min(5_000_000, healthMonthly * 180));
  }
  if (liquidGap > 0) {
    add("high", "crosssell.product.emergencyFund", "crosssell.cat.reserve", "crosssell.why.reserveGap", liquidGap);
  }
  if (idleCash > 50_000 && nw.byClass.cash >= nw.byClass.investments) {
    add("high", "crosssell.product.cashMigration", "crosssell.cat.investments", "crosssell.why.idleCash", idleCash);
  }
  if (!hasPension && (isPJ || annualIncome > 240_000)) {
    add(isPJ ? "high" : "medium", "crosssell.product.pension", "crosssell.cat.retirement", isPJ ? "crosssell.why.noPensionPj" : "crosssell.why.pensionTopUp", Math.round(annualIncome * 0.12));
  }
  if (nearRetirement && investable > 0) {
    add(age >= 58 ? "high" : "medium", "crosssell.product.incomeLadder", "crosssell.cat.retirement", "crosssell.why.incomeLadder", Math.round(investable * 0.4));
  }
  if (educationGoal) {
    add("high", "crosssell.product.education", "crosssell.cat.goals", "crosssell.why.educationGoal", educationGoal.targetAmount);
  }
  if (propertyGoal) {
    add("medium", "crosssell.product.realEstate", "crosssell.cat.credit", "crosssell.why.propertyGoal", propertyGoal.targetAmount);
  }
  if (mortgageBalance > 0) {
    add("medium", "crosssell.product.mortgageReview", "crosssell.cat.credit", "crosssell.why.mortgage", mortgageBalance);
  }
  if (wealthy && investable > 0) {
    add(p.segment === "private" ? "high" : "medium", "crosssell.product.offshore", "crosssell.cat.international", "crosssell.why.offshore", Math.round(investable * 0.2));
  }
  if (p.segment === "private") {
    add("high", "crosssell.product.succession", "crosssell.cat.wealth", "crosssell.why.succession", nw.netWorth);
  }
  if (cf.surplus > 500) {
    add("medium", "crosssell.product.autoInvest", "crosssell.cat.investments", "crosssell.why.autoInvest", Math.round(cf.surplus * 12));
  }

  // De-duplicate by product (keep the higher score) and rank.
  const byProduct = new Map<string, CrossSellOpportunity>();
  for (const o of out) {
    const ex = byProduct.get(o.productKey);
    if (!ex || o.score > ex.score) byProduct.set(o.productKey, o);
  }
  return [...byProduct.values()].sort((a, b) => b.score - a.score).slice(0, 6);
}
