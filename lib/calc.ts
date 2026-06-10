/**
 * Project Vision — pure financial calculations.
 *
 * Everything here is deterministic and side-effect free so the what-if sliders
 * in the scenario step can recompute charts live without flicker. The planning
 * engine stub (`/lib/api/planning-engine.ts`) wraps these with artificial
 * latency to imitate a remote call.
 *
 * Projections are computed in REAL terms (today's BRL). Returns are therefore
 * real (above inflation); inflation is carried for display/labels only.
 */

import type {
  Asset,
  AssetClass,
  CashFlow,
  Dependent,
  Goal,
  GoalFunding,
  LifeEvent,
  NetWorth,
  ProjectionResult,
  RiskProfile,
} from "@/lib/types";
import { DEFAULT_PREMISES, inssRetirementBenefit, type Premises } from "@/lib/premises";
import {
  annuityFactorE,
  compound,
  fvSeries,
  projectInputViaEngine,
} from "@/lib/engine/adapter";

/** Fallback projection horizon when no plan premises are supplied. */
export const PLANNING_HORIZON_AGE = DEFAULT_PREMISES.planningHorizonAge;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function ageFromDob(dob: string, now: Date = new Date()): number {
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** A dependent's age — derived from birth date when present, else the typed age. */
export function dependentAge(d: Dependent): number {
  return d.birthDate ? ageFromDob(d.birthDate) : d.age;
}

/* ------------------------------------------------------------------ */
/* Cash flow                                                           */
/* ------------------------------------------------------------------ */

export interface CashFlowTotals {
  income: number;
  expense: number;
  surplus: number;
  /** Surplus as a share of income, 0..1 (can be negative). */
  savingsRate: number;
}

/** Total monthly debt service (parcelas) across all liabilities. */
export function monthlyDebtService(nw: NetWorth): number {
  return nw.liabilities.reduce((s, l) => s + (l.monthlyPayment ?? 0), 0);
}

export function cashFlowTotals(cf: CashFlow, nw?: NetWorth): CashFlowTotals {
  // One-time events (recurring === false) don't count toward monthly income.
  const income = cf.incomes
    .filter((i) => i.recurring !== false)
    .reduce((s, i) => s + i.monthly, 0);
  // Debt service comes from the liabilities' installments (single source of
  // truth) when net worth is supplied — manual "debt" expenses are then ignored
  // to avoid double counting; otherwise fall back to any manual debt entries.
  const nonDebt = cf.expenses
    .filter((e) => e.category !== "debt")
    .reduce((s, e) => s + e.monthly, 0);
  const manualDebt = cf.expenses
    .filter((e) => e.category === "debt")
    .reduce((s, e) => s + e.monthly, 0);
  const liabilityDebt = nw ? monthlyDebtService(nw) : 0;
  const debtService = liabilityDebt > 0 ? liabilityDebt : manualDebt;
  const expense = nonDebt + debtService;
  const surplus = income - expense;
  const savingsRate = income > 0 ? surplus / income : 0;
  return { income, expense, surplus, savingsRate };
}

/** Monthly expenses excluding debt service (debt is assumed cleared by retirement). */
export function monthlyNeedsBaseline(cf: CashFlow): number {
  return cf.expenses
    .filter((e) => e.category !== "debt")
    .reduce((s, e) => s + e.monthly, 0);
}

/** Monthly income that plausibly continues into retirement (pension/rent). */
export function monthlyContinuingIncome(cf: CashFlow): number {
  return cf.incomes
    .filter((i) => i.kind === "pension" || i.kind === "rent")
    .reduce((s, i) => s + i.monthly, 0);
}

/** Recurring (non-event) monthly income. */
export function recurringMonthlyIncome(cf: CashFlow): number {
  return cf.incomes.filter((i) => i.recurring !== false).reduce((s, i) => s + i.monthly, 0);
}

/** Sum of essential (primary) monthly expenses — the emergency-reserve base. */
export function essentialMonthlyExpenses(cf: CashFlow): number {
  return cf.expenses.filter((e) => e.primary !== false).reduce((s, e) => s + e.monthly, 0);
}

/** Estimated monthly INSS benefit (capped at the ceiling premise). Heuristic for the prototype. */
export function estimatedInssBenefit(cf: CashFlow, p: Premises = DEFAULT_PREMISES): number {
  return inssRetirementBenefit(recurringMonthlyIncome(cf), p);
}

/** Target monthly income in retirement, from the client's retirementIncome config (default 70%). */
export function retirementMonthlyNeed(cf: CashFlow): number {
  const ri = cf.retirementIncome ?? { mode: "percent" as const, value: 70, inss: true };
  if (ri.mode === "nominal") return Math.max(0, ri.value);
  return Math.max(0, (ri.value / 100) * recurringMonthlyIncome(cf));
}

/** Monthly income continuing into retirement: pension + rent, plus INSS when opted in. */
export function continuingMonthlyIncome(cf: CashFlow, p: Premises = DEFAULT_PREMISES): number {
  const inss = cf.retirementIncome?.inss ? estimatedInssBenefit(cf, p) : 0;
  return monthlyContinuingIncome(cf) + inss;
}

/** Emergency-reserve target = reserve-months premise × essential monthly expenses. */
export function emergencyReserveTarget(cf: CashFlow, p: Premises = DEFAULT_PREMISES): number {
  return p.emergencyReserveMonths * essentialMonthlyExpenses(cf);
}

/**
 * Succession liquidity target = max(0, succession% of gross assets − previdência − seguros).
 * Previdência = pension asset class; `insurance` is the life-insurance coverage.
 */
export function successionTarget(
  nw: NetWorth,
  p: Premises = DEFAULT_PREMISES,
  insurance = 0,
): number {
  const t = netWorthTotals(nw);
  return Math.max(
    0,
    Math.round((p.successionPctOfGross / 100) * t.totalAssets - t.byClass.pension - insurance),
  );
}

/* ------------------------------------------------------------------ */
/* Net worth                                                           */
/* ------------------------------------------------------------------ */

export interface NetWorthTotals {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  byClass: Record<AssetClass, number>;
}

const ASSET_CLASSES: AssetClass[] = [
  "cash",
  "investments",
  "pension",
  "real_estate",
  "vehicle",
  "foreign",
  "fgts",
  "business",
  "other",
];

/** An asset's value converted to BRL (foreign holdings × their FX rate). */
export function assetValueBRL(a: Asset): number {
  return a.currency && a.currency !== "BRL" ? a.value * (a.fxRate ?? 1) : a.value;
}

export function netWorthTotals(nw: NetWorth): NetWorthTotals {
  const byClass = Object.fromEntries(
    ASSET_CLASSES.map((c) => [c, 0]),
  ) as Record<AssetClass, number>;

  let totalAssets = 0;
  let liquidAssets = 0;
  for (const a of nw.assets) {
    const v = assetValueBRL(a);
    totalAssets += v;
    byClass[a.assetClass] += v;
    if (a.liquid) liquidAssets += v;
  }
  const totalLiabilities = nw.liabilities.reduce((s, l) => s + l.balance, 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    liquidAssets,
    byClass,
  };
}

/** Investable wealth that feeds the projection (cash + investments + pension). */
export function investableWealth(nw: NetWorth): number {
  const t = netWorthTotals(nw);
  return t.byClass.cash + t.byClass.investments + t.byClass.pension;
}

/* ------------------------------------------------------------------ */
/* Suitability                                                         */
/* ------------------------------------------------------------------ */

export interface SuitabilityResult {
  score: number; // 0..100
  profile: RiskProfile;
}

/**
 * Average of the chosen option values, normalized against the max option value
 * (questions are authored on a 0..3 scale: 0 = most conservative).
 */
export function scoreSuitability(
  answers: Record<string, number>,
  maxPerQuestion = 3,
): SuitabilityResult | null {
  const values = Object.values(answers);
  if (values.length === 0) return null;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const score = clamp((avg / maxPerQuestion) * 100, 0, 100);
  const profile: RiskProfile =
    score < 34 ? "conservative" : score < 67 ? "moderate" : "aggressive";
  return { score: Math.round(score), profile };
}

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

export interface ProjectionInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  investableNow: number;
  /** Total monthly savings directed at the plan (real BRL). */
  monthlyContribution: number;
  /** Expected annual real return, e.g. 0.05 for IPCA+5%. */
  realReturn: number;
  /** Current annual earned income (real BRL) — for the pre-retirement chart. */
  annualIncomeNow: number;
  /** Annual spending need in retirement (real BRL). */
  annualNeeds: number;
  /** Annual income continuing into retirement: INSS, rent, pension (real BRL). */
  annualOtherIncome: number;
  goals: Goal[];
  /** Financial life events applied as one-time/recurring inflows/outflows. */
  lifeEvents?: LifeEvent[];
}

/** Future value of a series of monthly contributions over `years`, real terms.
 *  Arithmetic: engine mathcore (annual annuity, END — same as v2). */
function fvOfContributions(monthly: number, years: number, r: number): number {
  if (years <= 0) return 0;
  return fvSeries(monthly * 12, r, years);
}

/** Present-value annuity factor for `n` years at real rate `r` (engine mathcore). */
export function annuityFactor(n: number, r: number): number {
  return annuityFactorE(n, r);
}

/** Projected funding of a single goal at its target year, 0..100 (engine arithmetic). */
export function goalFundedPct(
  goal: Goal,
  realReturn: number,
  thisYear: number = new Date().getFullYear(),
): number {
  const yrs = Math.max(0, goal.targetYear - thisYear);
  const projected =
    compound(goal.currentAmount, realReturn, yrs) +
    fvOfContributions(goal.monthlyContribution ?? 0, yrs, realReturn);
  return goal.targetAmount > 0
    ? clamp((projected / goal.targetAmount) * 100, 0, 100)
    : 100;
}

/** How many goals are "achievable" — funded at or above `threshold`% by target year. */
export function achievableGoalCount(goalFunding: GoalFunding[], threshold = 90): number {
  return goalFunding.filter((g) => g.fundedPct >= threshold).length;
}

/**
 * Wealth projection — delegated to the Vision Engine (monthly internal loop,
 * annual output). The adapter preserves the v2 display semantics; legitimate
 * monthly-compounding deltas are documented in PARITY_NOTES.md.
 */
export function project(input: ProjectionInput): ProjectionResult {
  return projectInputViaEngine(input);
}
