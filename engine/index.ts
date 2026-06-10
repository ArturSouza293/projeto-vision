/**
 * Vision Engine — public contract.
 *
 * The ONLY arithmetic source of the app (Regra Zero). UI code consumes this
 * module through the adapter (`lib/engine/engineClient.ts`) and never does
 * financial math of its own.
 */
import { idealPlan } from "./ideal";
import { solveTVM } from "./mathcore";
import { project } from "./projection";
import { solveGoal } from "./solve";
import type { BiaProposal, PlanningCase, PlanningEngine, TVMQuery } from "./types";

export const engine: PlanningEngine = {
  project: (c: PlanningCase) => project(c),
  solveGoal: (c: PlanningCase, goalId: string) => solveGoal(c, goalId),
  idealPlan: (c: PlanningCase, proposta?: BiaProposal) => idealPlan(c, proposta),
  solveTVM: (q: TVMQuery) => solveTVM(q),
};

export * from "./types";
export { DEFAULT_ASSUMPTIONS, resolveAssumptions, planReturnAA } from "./assumptions";
export {
  annualToMonthly,
  monthlyToAnnual,
  convertRate,
  fisherReal,
  fisherNominal,
  fvAnnuity,
  pvAnnuity,
  pvGrowingAnnuity,
  fvGrowingAnnuity,
  solveTVM,
} from "./mathcore";
export { priceSchedule, sacSchedule, pricePayment, liabilityPaymentAt } from "./amortization";
export {
  sobraMensal,
  rendaMensalRecorrente,
  despesaMensalTotal,
  despesaMensalEssencial,
  servicoDividaMensal,
  alvoReserva,
  alvoSucessao,
  capitalNecessarioAposentadoria,
  rendaAlvoAposentadoriaBruta,
  rendaAlvoMensalLiquida,
  rendaContinuaAposentadoria,
  patrimonioBruto,
} from "./rules";
export { project } from "./projection";
export { summarize, compare, deltaKPIs, type PlanSummaryKPIs, type PlanSummaryDelta } from "./summary";
export { solveGoal, resolveAlvo, resolveAnoAlvo, pmtParaAlvo } from "./solve";
export { idealPlan, ensureMandatoryGoals } from "./ideal";
export { validateBiaProposal, type ValidationResult } from "./validator";
export { createCaseStore, caseStore, type CaseStore } from "./case-store";
