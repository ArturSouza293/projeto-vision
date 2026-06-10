/**
 * Golden-values instrument — computes "what the app displays" through the
 * app's REAL code path (the same functions the workspace calls), full
 * precision. Captured BEFORE the engine integration; re-run after each
 * substitution step to prove parity (±R$ 1,00 ou ±0,1%, o que for maior).
 *
 * Note: some app functions use the current date (ageFromDob, current year);
 * capture and compare must run within the same period for exact parity.
 */
import {
  achievableGoalCount,
  cashFlowTotals,
  emergencyReserveTarget,
  estimatedInssBenefit,
  continuingMonthlyIncome,
  investableWealth,
  monthlyDebtService,
  netWorthTotals,
  retirementMonthlyNeed,
  successionTarget,
} from "@/lib/calc";
import {
  defaultAssumptions,
  defaultGoals,
  projectPlan,
  returnCheckpoints,
  withMandatoryGoals,
} from "@/lib/plan";
import { getPremises } from "@/lib/premises";
import { heuristicParams, idealBounds } from "@/lib/plano-ideal";
import { SEED_PLANS } from "@/lib/mock/clients";
import type { LifeEvent, Plan } from "@/lib/types";

/** Reference life events for the "completo" case (events + liabilities). */
const GOLDEN_EVENTS: LifeEvent[] = [
  { id: "golden-ev1", presetKey: "property_buy", kind: "outflow", year: 2031, amount: 600000 },
  { id: "golden-ev2", presetKey: "inheritance", kind: "inflow", year: 2040, amount: 200000 },
  {
    id: "golden-ev3",
    presetKey: "education",
    kind: "outflow",
    year: 2032,
    amount: 40000,
    recurring: true,
    endYear: 2035,
  },
];

export const GOLDEN_CASES: { key: string; clientId: string; lifeEvents?: LifeEvent[] }[] = [
  { key: "simples", clientId: "camila-diego" },
  { key: "completo", clientId: "fernanda", lifeEvents: GOLDEN_EVENTS },
  { key: "sobra-negativa", clientId: "marcos" },
];

function loadPlan(clientId: string, lifeEvents?: LifeEvent[]): Plan {
  const seed = SEED_PLANS.find((p) => p.clientId === clientId);
  if (!seed) throw new Error(`golden: unknown client ${clientId}`);
  const plan: Plan = structuredClone(seed);
  plan.goals = withMandatoryGoals(plan);
  if (lifeEvents) plan.lifeEvents = structuredClone(lifeEvents);
  return plan;
}

/** Every number the UI derives for a case, via the live code path. */
export function computeCase(clientId: string, lifeEvents?: LifeEvent[]) {
  const plan = loadPlan(clientId, lifeEvents);
  const a = defaultAssumptions(plan); // what the Base scenario gets
  const premises = getPremises(plan);

  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const nw = netWorthTotals(plan.netWorth);
  const result = projectPlan(plan, a);

  // Workspace header/params derivations (workspace.tsx)
  const goalContributions = plan.goals.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);
  const allocated = a.monthlyContribution + goalContributions;
  const freeBalance = cf.surplus - allocated;
  const reserveFloor = emergencyReserveTarget(plan.cashFlow, premises);
  const reserveShort = Math.max(0, reserveFloor - nw.liquidAssets);

  const sample = (idx: number) => {
    const p = result.points[Math.min(Math.max(idx, 0), result.points.length - 1)];
    return p ? { year: p.year, wealth: p.wealth, income: p.income, needs: p.needs } : null;
  };
  const retIdx = result.points.findIndex((p) => p.age === a.retirementAge);

  return {
    clientId,
    assumptions: a,
    cashFlow: { ...cf },
    netWorth: {
      totalAssets: nw.totalAssets,
      totalLiabilities: nw.totalLiabilities,
      netWorth: nw.netWorth,
      liquidAssets: nw.liquidAssets,
      byClass: nw.byClass,
    },
    debtService: monthlyDebtService(plan.netWorth),
    investable: investableWealth(plan.netWorth),
    premissasDerivadas: {
      reserveFloor,
      reserveShort,
      succession: successionTarget(plan.netWorth, premises, plan.clientProfile.lifeInsurance ?? 0),
      retirementNeed: retirementMonthlyNeed(plan.cashFlow),
      continuingIncome: continuingMonthlyIncome(plan.cashFlow, premises),
      inss: estimatedInssBenefit(plan.cashFlow, premises),
    },
    kpis: {
      wealthAtRetirement: result.wealthAtRetirement,
      retirementDurationYears: result.retirementDurationYears,
      probabilityOfSuccess: result.probabilityOfSuccess,
      estateAtDeath: result.estateAtDeath,
      incomeGap: result.incomeGap,
      objetivos: `${achievableGoalCount(result.goalFunding)}/${plan.goals.length}`,
    },
    curve: {
      points: result.points.length,
      first: sample(0),
      y5: sample(5),
      y10: sample(10),
      atRetirement: retIdx >= 0 ? sample(retIdx) : null,
      last: sample(result.points.length - 1),
    },
    goalFunding: result.goalFunding,
    workspace: {
      goalContributions,
      allocated,
      freeBalance,
      deficit: cf.surplus < 0,
      overAllocated: cf.surplus >= 0 && allocated > 0 && freeBalance < 0,
    },
    checkpoints: returnCheckpoints(plan, a),
    planoIdeal: {
      bounds: idealBounds(plan),
      heuristic: heuristicParams(plan, a),
    },
    defaultGoalTargets: defaultGoals(plan).map((g) => ({ type: g.type, targetAmount: g.targetAmount })),
  };
}

export function computeAll() {
  return Object.fromEntries(GOLDEN_CASES.map((c) => [c.key, computeCase(c.clientId, c.lifeEvents)]));
}
