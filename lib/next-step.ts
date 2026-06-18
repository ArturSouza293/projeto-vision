/**
 * C11 — ponte motor→UI: calcula os SINAIS VITAIS e as MAGNITUDES (pelo motor,
 * via bisseção em projectPlan — Regra Zero) para alimentar nextStepFromVitalSign.
 * Mantido fora de components/ (sem aritmética nova na UI).
 */
import { achievableGoalCount, ageFromDob, netWorthTotals } from "@/lib/calc";
import { projectPlan } from "@/lib/plan";
import type {
  Plan,
  ProjectionPoint,
  ProjectionResult,
  ScenarioAssumptions,
} from "@/lib/types";
import type { MagnitudesMotor, SinaisVitais } from "@/lib/vital-signs";

/** Δ aporte mensal (motor) para cobrir a lacuna. null = já coberto ou inalcançável. */
function deltaAporteParaZerar(plan: Plan, a: ScenarioAssumptions): number | null {
  if (projectPlan(plan, a).incomeGap >= 0) return null;
  const TETO = 500_000;
  if (projectPlan(plan, { ...a, monthlyContribution: a.monthlyContribution + TETO }).incomeGap < 0) {
    return null; // inalcançável só com aporte
  }
  let lo = 0;
  let hi = TETO;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (projectPlan(plan, { ...a, monthlyContribution: a.monthlyContribution + mid }).incomeGap >= 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return Math.round(hi);
}

/**
 * C10 — projeção "desejável": a trajetória de patrimônio que zera a lacuna só
 * com aporte (mesmo motor, Regra Zero). Retorna null se a lacuna já está coberta
 * ou se é inalcançável apenas via aporte (aí não há linha a sobrepor).
 */
export function projecaoDesejavel(
  plan: Plan,
  a: ScenarioAssumptions,
): ProjectionPoint[] | null {
  if (projectPlan(plan, a).incomeGap >= 0) return null; // já no alvo
  const delta = deltaAporteParaZerar(plan, a);
  if (delta == null) return null; // inalcançável só com aporte
  return projectPlan(plan, {
    ...a,
    monthlyContribution: a.monthlyContribution + delta,
  }).points;
}

/** Anos para adiar o usufruto (motor) até cobrir a lacuna. null se já coberto/inalcançável. */
function anosParaAdiar(plan: Plan, a: ScenarioAssumptions): number | null {
  if (projectPlan(plan, a).incomeGap >= 0) return null;
  for (let n = 1; n <= 20; n++) {
    if (a.retirementAge + n > 85) break;
    if (projectPlan(plan, { ...a, retirementAge: a.retirementAge + n }).incomeGap >= 0) return n;
  }
  return null;
}

/** Constrói sinais + magnitudes para o C11 a partir do plano/cenário/projeção. */
export function nextStepInputs(
  plan: Plan,
  a: ScenarioAssumptions,
  result: ProjectionResult,
): { sinais: SinaisVitais; magnitudes: MagnitudesMotor } {
  const currentAge = ageFromDob(plan.clientProfile.dateOfBirth);
  const horizonteAnos = Math.max(0, a.retirementAge - currentAge);
  const lacunaMensal = Math.max(0, -result.incomeGap); // incomeGap < 0 = falta
  const nw = netWorthTotals(plan.netWorth);

  const fundByGoal = new Map(result.goalFunding.map((g) => [g.goalId, g.fundedPct]));
  const legado = plan.goals.find((g) => g.type === "legacy" || g.type === "protection");
  const espolioDescoberto = !!legado && (fundByGoal.get(legado.id) ?? 100) < 90;

  const sinais: SinaisVitais = {
    lacunaMensal,
    probabilidade: result.probabilityOfSuccess,
    horizonteAnos,
    perfilConservadorLongoPrazo: plan.suitability.profile === "conservative" && horizonteAnos > 15,
    espolioDescoberto,
    objetivosAtingiveis: achievableGoalCount(result.goalFunding),
    objetivosTotais: plan.goals.length,
  };

  const magnitudes: MagnitudesMotor = {
    deltaAporteParaZerar: lacunaMensal > 0 ? deltaAporteParaZerar(plan, a) : null,
    anosParaAdiar: lacunaMensal > 0 ? anosParaAdiar(plan, a) : null,
    // reduzir a renda-alvo (Padrão de Vida) pela lacuna fecha-a ~1:1.
    reducaoRendaAlvoMensal: lacunaMensal > 0 ? Math.round(lacunaMensal) : null,
    aporteUnicoDisponivel: nw.liquidAssets > 0 ? Math.round(nw.liquidAssets) : null,
  };

  return { sinais, magnitudes };
}
