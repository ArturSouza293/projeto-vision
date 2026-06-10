/**
 * Vision Engine — solveGoal.
 *
 * PMT to hit a goal by its target year (TVM), feasible date by bisection,
 * always clamped to the case's available surplus. Full precision (C10).
 */
import { planReturnAA, resolveAssumptions } from "./assumptions";
import { annualToMonthly, fvAnnuity, solveTVM } from "./mathcore";
import { alvoReserva, alvoSucessao, capitalNecessarioAposentadoria, sobraMensal } from "./rules";
import type { Assumptions, Goal, GoalSolution, PlanningCase } from "./types";

/** A goal's target amount — explicit, or derived by the Vision rules. */
export function resolveAlvo(c: PlanningCase, a: Assumptions, g: Goal, multiplicador?: 6 | 12): number {
  if (g.valorAlvo !== undefined) return Math.max(0, g.valorAlvo);
  switch (g.tipo) {
    case "reserva":
      return alvoReserva(c, a, multiplicador);
    case "sucessao":
      return alvoSucessao(c, a);
    case "aposentadoria":
      return capitalNecessarioAposentadoria(c, a, planReturnAA(c, a));
    default:
      return 0;
  }
}

/** A goal's target year — explicit, or a sensible default by type. */
export function resolveAnoAlvo(c: PlanningCase, a: Assumptions, g: Goal): number {
  if (g.anoAlvo !== undefined) return g.anoAlvo;
  const anoAposentadoria = a.anoBase + Math.max(1, c.profile.idadeUsufruto - c.profile.idadeAtual);
  switch (g.tipo) {
    case "reserva":
      return a.anoBase + 2; // build the reserve fast (premissa ilustrativa)
    case "aposentadoria":
    case "sucessao":
      return anoAposentadoria;
    default:
      return a.anoBase + 10;
  }
}

/** Monthly PMT needed to reach `alvo` in `nMeses`, given pv invested today.
 *  CONTRACT: with nMeses ≤ 0 (goal due now/overdue) the return degenerates to
 *  the immediate LUMP shortfall (alvo − pv) — callers clamp it to the surplus,
 *  and the validator never lets the BIA propose the base year. */
export function pmtParaAlvo(alvo: number, pv: number, iM: number, nMeses: number, timing: "end" | "begin"): number {
  if (nMeses <= 0) return Math.max(0, alvo - pv);
  const fvPv = pv * Math.pow(1 + iM, nMeses);
  if (fvPv >= alvo) return 0;
  const pmt = solveTVM({ n: nMeses, i: iM, pv: -pv, fv: alvo, timing });
  return Math.max(0, -pmt);
}

export function solveGoal(c: PlanningCase, goalId: string): GoalSolution {
  const a = resolveAssumptions(c);
  const g = c.goals.find((x) => x.id === goalId);
  if (!g) throw new Error(`solveGoal: goal "${goalId}" not found`);

  const iM = annualToMonthly(planReturnAA(c, a));
  const timing = a.timingAportes;
  const alvo = resolveAlvo(c, a, g);
  const anoAlvo = resolveAnoAlvo(c, a, g);
  const nMeses = Math.max(0, (anoAlvo - a.anoBase) * 12);
  const pv = Math.max(0, g.valorAtual ?? 0);

  const necessario = pmtParaAlvo(alvo, pv, iM, nMeses, timing);

  // Surplus available to THIS goal = case surplus − contributions already
  // committed to the other goals (never negative).
  const outros = c.goals
    .filter((x) => x.id !== goalId)
    .reduce((s, x) => s + Math.max(0, x.aporteMensal ?? 0), 0);
  const disponivel = Math.max(0, sobraMensal(c) - outros);

  const clamped = Math.min(necessario, disponivel);
  const viavel = necessario <= disponivel + 1e-9;

  // Earliest feasible year: PMT(n) is decreasing in n, so bisect on years.
  let anoViavel: number | null = anoAlvo;
  if (!viavel) {
    anoViavel = null;
    if (disponivel > 0) {
      let lo = Math.max(1, anoAlvo - a.anoBase);
      let hi = 80;
      const feasible = (anos: number) => pmtParaAlvo(alvo, pv, iM, anos * 12, timing) <= disponivel + 1e-9;
      if (feasible(hi)) {
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (feasible(mid)) hi = mid;
          else lo = mid + 1;
        }
        anoViavel = a.anoBase + lo;
      }
    }
  }

  const valorProjetado = pv * Math.pow(1 + iM, nMeses) + fvAnnuity(clamped, iM, nMeses, timing);

  return {
    goalId,
    aporteNecessarioMensal: necessario,
    aporteClampedMensal: clamped,
    anoViavel,
    viavelComSobra: viavel,
    valorAlvo: alvo,
    valorProjetadoNoAlvo: valorProjetado,
  };
}
