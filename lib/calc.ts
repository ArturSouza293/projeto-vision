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
  ProjectionPoint,
  ProjectionResult,
  RiskProfile,
} from "@/lib/types";
import { DEFAULT_PREMISES, inssRetirementBenefit, type Premises } from "@/lib/premises";

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

/** Future value of a series of monthly contributions over `years`, real terms. */
function fvOfContributions(monthly: number, years: number, r: number): number {
  if (years <= 0) return 0;
  const annual = monthly * 12;
  if (Math.abs(r) < 1e-9) return annual * years;
  return annual * ((Math.pow(1 + r, years) - 1) / r);
}

/** Present-value annuity factor for `n` years at real rate `r`. */
export function annuityFactor(n: number, r: number): number {
  if (n <= 0) return 0;
  if (Math.abs(r) < 1e-9) return n;
  return (1 - Math.pow(1 + r, -n)) / r;
}

/** Projected funding of a single goal at its target year, 0..100. */
export function goalFundedPct(
  goal: Goal,
  realReturn: number,
  thisYear: number = new Date().getFullYear(),
): number {
  const yrs = Math.max(0, goal.targetYear - thisYear);
  const projected =
    goal.currentAmount * Math.pow(1 + realReturn, yrs) +
    fvOfContributions(goal.monthlyContribution ?? 0, yrs, realReturn);
  return goal.targetAmount > 0
    ? clamp((projected / goal.targetAmount) * 100, 0, 100)
    : 100;
}

/** How many goals are "achievable" — funded at or above `threshold`% by target year. */
export function achievableGoalCount(goalFunding: GoalFunding[], threshold = 90): number {
  return goalFunding.filter((g) => g.fundedPct >= threshold).length;
}

export function project(input: ProjectionInput): ProjectionResult {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    investableNow,
    monthlyContribution,
    realReturn: r,
    annualIncomeNow,
    annualNeeds,
    annualOtherIncome,
    goals,
  } = input;

  const annualContribution = monthlyContribution * 12;
  const points: ProjectionPoint[] = [];
  const thisYear = new Date().getFullYear();

  // Net cash impact per calendar year from life events (one-time or recurring).
  const eventByYear = new Map<number, number>();
  for (const ev of input.lifeEvents ?? []) {
    const sign = ev.kind === "inflow" ? 1 : -1;
    const last = ev.recurring && ev.endYear ? Math.max(ev.year, ev.endYear) : ev.year;
    for (let y = ev.year; y <= last; y++) {
      eventByYear.set(y, (eventByYear.get(y) ?? 0) + sign * ev.amount);
    }
  }

  let wealth = Math.max(0, investableNow);
  let contributionsCum = 0;
  let wealthAtRetirement = wealth;
  let depletionAge: number | null = null;

  const lastAge = Math.max(retirementAge, lifeExpectancy);
  for (let age = currentAge; age <= lastAge; age++) {
    const year = thisYear + (age - currentAge);
    const retired = age >= retirementAge;

    let income: number;
    if (!retired) {
      // Accumulation: grow then contribute.
      wealth = wealth * (1 + r) + annualContribution;
      contributionsCum += annualContribution;
      income = annualIncomeNow;
    } else {
      // Decumulation: grow (draw applied after life events below).
      wealth = wealth * (1 + r);
      income = annualOtherIncome;
    }

    // Apply this year's life events.
    const delta = eventByYear.get(year);
    if (delta) wealth = Math.max(0, wealth + delta);

    // Wealth at retirement = end of the last accumulation year (post-events).
    if (age === retirementAge - 1) wealthAtRetirement = wealth;

    if (retired) {
      const gap = Math.max(0, annualNeeds - annualOtherIncome);
      const draw = Math.min(gap, Math.max(0, wealth));
      wealth -= draw;
      income = annualOtherIncome + draw;
      if (wealth <= 0 && depletionAge === null) depletionAge = age;
    }

    points.push({
      year,
      age,
      wealth: Math.max(0, Math.round(wealth)),
      contributions: Math.round(contributionsCum),
      income: Math.round(income),
      needs: Math.round(annualNeeds),
    });
  }

  // If retirement is at/below current age, wealthAtRetirement is just "now".
  if (retirementAge <= currentAge) wealthAtRetirement = investableNow;

  const retirementDurationYears =
    depletionAge !== null
      ? depletionAge - retirementAge
      : lifeExpectancy - retirementAge;

  const estateAtDeath = points.length ? points[points.length - 1].wealth : 0;

  // Deterministic probability-of-success: ratio of capital at retirement to the
  // capital needed to fund the spending gap across retirement, via a logistic.
  const retirementYears = Math.max(1, lifeExpectancy - retirementAge);
  const neededCapital =
    Math.max(0, annualNeeds - annualOtherIncome) *
    annuityFactor(retirementYears, r);
  const ratio = neededCapital <= 0 ? 2 : wealthAtRetirement / neededCapital;
  const probabilityOfSuccess = Math.round(
    clamp(100 / (1 + Math.exp(-3.5 * (ratio - 1))), 1, 99),
  );

  // Per-goal funding at its target year.
  const goalFunding = goals.map((g) => ({
    goalId: g.id,
    fundedPct: Math.round(goalFundedPct(g, r, thisYear)),
  }));

  // Monthly real income gap at retirement (negative = shortfall).
  const sustainableMonthly =
    (wealthAtRetirement / annuityFactor(retirementYears, r) + annualOtherIncome) /
    12;
  const incomeGap = Math.round(sustainableMonthly - annualNeeds / 12);

  return {
    points,
    wealthAtRetirement: Math.round(wealthAtRetirement),
    retirementDurationYears,
    probabilityOfSuccess,
    estateAtDeath,
    goalFunding,
    incomeGap,
  };
}
