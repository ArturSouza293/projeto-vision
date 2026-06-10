/**
 * Vision Engine — default assumptions.
 *
 * PREMISSAS ILUSTRATIVAS — decisão de negócio. Os valores abaixo validam a
 * FUNCIONALIDADE do motor; não são certificados fiscal nem atuarialmente e
 * devem ser revisados por um comitê antes de qualquer uso real.
 *
 * Calibration note (C7): the engine projects with GEOMETRIC mean returns.
 * If arithmetic means are sourced (e.g. for a future Monte Carlo v2), convert
 * with the volatility drag: μ_geo ≈ μ_arit − σ²/2.
 */
import type { Assumptions, PlanningCase } from "./types";

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  // The adapter ALWAYS provides anoBase; this fallback only keeps partial
  // cases from throwing (documented default — tests pass it explicitly).
  anoBase: new Date().getFullYear(),

  /** IPCA-like long-run inflation (illustrative). */
  inflacaoAA: 0.04,

  /** Real annual returns by suitability profile (illustrative, geometric). */
  retornosReaisAA: {
    conservador: 0.03,
    moderado: 0.045,
    agressivo: 0.06,
  },
  perfilRetorno: "moderado",

  /** Real annual return by asset class when the item doesn't specify one. */
  retornoRealPorClasse: {
    liquidez: 0.02,
    previdencia: 0.04,
    seguro: 0,
    imovel: 0,
    exterior: 0.045,
    outros: 0,
  },

  /** Conta centenária: plan until age 100. */
  longevidadeAnos: 100,

  multiplicadorReservaDefault: 6,

  /** Succession liquidity = 20% × gross assets − previdência − seguros. */
  percentualSucessao: 0.2,

  /** BEG/END (HP-12C). App convention: contributions at end of period. */
  timingAportes: "end",

  /** Constant currency by default (C4). */
  modoProjecao: "real",

  /** Conta centenária por default (C8). */
  metodoAposentadoria: "depletion",
};

/** Merge a case's partial assumptions over the defaults (tolerant input). */
export function resolveAssumptions(c: PlanningCase): Assumptions {
  const a = c.assumptions ?? {};
  return {
    ...DEFAULT_ASSUMPTIONS,
    ...a,
    retornosReaisAA: { ...DEFAULT_ASSUMPTIONS.retornosReaisAA, ...(a.retornosReaisAA ?? {}) },
    retornoRealPorClasse: {
      ...DEFAULT_ASSUMPTIONS.retornoRealPorClasse,
      ...(a.retornoRealPorClasse ?? {}),
    },
  };
}

/** The real annual return the plan compounds new contributions at. */
export function planReturnAA(c: PlanningCase, a: Assumptions): number {
  return c.planParams?.retornoRealAAOverride ?? a.retornosReaisAA[a.perfilRetorno];
}
