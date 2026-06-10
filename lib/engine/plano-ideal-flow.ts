/**
 * Plano Ideal — fluxo Regra Zero: "a LLM propõe ESTRUTURA, o motor calcula".
 *
 * A proposta da BIA (ordem de prioridade, anos-alvo, multiplicador 6|12,
 * método de aposentadoria, flags booleanas) passa pelo validador whitelist do
 * engine; QUALQUER campo numérico-monetário é rejeitado. Os quatro parâmetros
 * exibidos saem 100% do motor (idealPlan + checkpoints), clampados duas vezes
 * (engine + sliders do app). O racional é um template i18n interpolado com os
 * `racionalSlots` do motor — a LLM nunca redige um número.
 */
import { engine, validateBiaProposal } from "@/engine";
import type { BiaProposal, Goal as EngineGoal, PlanningCase, TipoObjetivo } from "@/engine";
import { ageFromDob, cashFlowTotals, monthlyDebtService, recurringMonthlyIncome } from "@/lib/calc";
import { getPremises } from "@/lib/premises";
import { returnCheckpoints } from "@/lib/plan";
import { clampParams, idealBounds, type IdealParams } from "@/lib/plano-ideal";
import type { GoalType, Plan, ScenarioAssumptions } from "@/lib/types";

const TIPO_MAP: Partial<Record<GoalType, TipoObjetivo>> = {
  emergency_reserve: "reserva",
  retirement: "aposentadoria",
  legacy: "sucessao",
};

function toEngineGoals(plan: Plan): EngineGoal[] {
  return plan.goals.map((g) => ({
    id: g.id,
    tipo: TIPO_MAP[g.type] ?? "outro",
    nome: g.label,
    valorAlvo: g.targetAmount,
    anoAlvo: g.targetYear,
    valorAtual: g.currentAmount,
    aporteMensal: g.monthlyContribution ?? 0,
    prioridade: g.priority === "high" ? "alta" : g.priority === "low" ? "baixa" : "media",
  }));
}

/** Full PlanningCase for idealPlan. Debt service rides as an expense item so
 *  the engine's surplus equals the app's surplus EXACTLY (paridade). */
export function toIdealCase(plan: Plan, a: ScenarioAssumptions): PlanningCase {
  const premises = getPremises(plan);
  const debt = monthlyDebtService(plan.netWorth);
  const ri = plan.cashFlow.retirementIncome;
  return {
    profile: {
      idadeAtual: ageFromDob(plan.clientProfile.dateOfBirth),
      idadeUsufruto: a.retirementAge,
    },
    incomes: {
      recorrentes: [{ nome: "renda", valorMensal: recurringMonthlyIncome(plan.cashFlow) }],
      rendaAposentadoria: {
        modo: ri?.mode === "nominal" ? "valor" : "percentual",
        valor: ri?.value ?? 70,
        flagINSS: ri?.inss ?? true,
        valorINSSMensal: 0, // continuing income handled by the app's premises layer
      },
    },
    expenses: {
      itens: [
        {
          nome: "despesas",
          valorMensal: plan.cashFlow.expenses
            .filter((e) => e.category !== "debt")
            .reduce((s, e) => s + e.monthly, 0),
          classe: "essencial",
        },
        ...(debt > 0 ? [{ nome: "dividas", valorMensal: debt, classe: "discricionaria" as const }] : []),
      ],
    },
    assets: { itens: [] },
    liabilities: { itens: [] },
    goals: toEngineGoals(plan),
    assumptions: {
      anoBase: new Date().getFullYear(),
      longevidadeAnos: premises.longevityAge,
      multiplicadorReservaDefault: premises.emergencyReserveMonths === 12 ? 12 : 6,
      percentualSucessao: premises.successionPctOfGross / 100,
    },
    planParams: { retornoRealAAOverride: a.expectedRealReturn / 100 },
  };
}

export interface IdealFlowResult {
  params: IdealParams;
  /** Raw numeric slots for the i18n rationale template (engine output only). */
  slots: {
    sobra: number;
    aporte: number;
    alocReserva: number;
    alocApos: number;
    alocSucessao: number;
    idade: number;
    retorno: number;
  };
  /** Whether a (valid) BIA proposal guided the allocation. */
  propostaAceita: boolean;
}

/** Deterministic ideal plan — optionally guided by the BIA's STRUCTURAL proposal. */
export function idealViaEngine(plan: Plan, a: ScenarioAssumptions, propostaRaw?: unknown): IdealFlowResult {
  const c = toIdealCase(plan, a);

  let proposta: BiaProposal | undefined;
  let propostaAceita = false;
  if (propostaRaw !== undefined) {
    const v = validateBiaProposal(propostaRaw, c); // Regra Zero gate
    if (v.ok) {
      proposta = v.proposal;
      propostaAceita = true;
    }
  }

  const p = engine.idealPlan(c, proposta);
  const premises = getPremises(plan);
  const bounds = idealBounds(plan);
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const goalContrib = plan.goals.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);

  // Headline contribution = engine allocation NET of what the goals already
  // commit (the app's slider shares the surplus with per-goal contributions).
  const headline = Math.max(0, Math.min(bounds.contribMax, p.aporteMensalTotal - goalContrib));

  // Smallest real return that funds the goals (deterministic, engine-backed
  // bisection); falls back to the 70% checkpoint, then the premise reference.
  const checkpoints = returnCheckpoints(plan, a);
  const retorno = checkpoints.full ?? checkpoints.p70 ?? premises.realReturnRef;

  const params = clampParams(
    {
      monthlyContribution: headline,
      retirementAge: p.idadeAposentadoria,
      expectedRealReturn: retorno,
      inflation: premises.inflationRef,
    },
    bounds,
  );

  const alocPorTipo = (tipo: TipoObjetivo) =>
    p.alocacoes.filter((x) => x.tipo === tipo).reduce((s, x) => s + x.aporteMensal, 0);

  return {
    params,
    slots: {
      sobra: Math.round(cf.surplus),
      aporte: params.monthlyContribution,
      alocReserva: Math.round(alocPorTipo("reserva")),
      alocApos: Math.round(alocPorTipo("aposentadoria")),
      alocSucessao: Math.round(alocPorTipo("sucessao")),
      idade: params.retirementAge,
      retorno: params.expectedRealReturn,
    },
    propostaAceita,
  };
}
