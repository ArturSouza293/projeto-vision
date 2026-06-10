/**
 * Vision Engine — regras de negócio Vision (reserva, sucessão, aposentadoria).
 *
 * Every target here is derived from the case + assumptions — never from the
 * LLM (Regra Zero). Full precision; rounding only at display (C10).
 */
import { annualToMonthly, pvAnnuity } from "./mathcore";
import type { Assumptions, PlanningCase } from "./types";

/* ------------------------------------------------------------ cash flow */

/** Recurring monthly income (annualized /12 to absorb 13º via mesesPorAno). */
export function rendaMensalRecorrente(c: PlanningCase): number {
  return c.incomes.recorrentes.reduce(
    (s, r) => s + (r.valorMensal * (r.mesesPorAno ?? 12)) / 12,
    0,
  );
}

/** Total monthly expenses (all classes). */
export function despesaMensalTotal(c: PlanningCase): number {
  return c.expenses.itens.reduce((s, d) => s + d.valorMensal, 0);
}

/** Essential monthly expenses — the emergency-reserve base. */
export function despesaMensalEssencial(c: PlanningCase): number {
  return c.expenses.itens
    .filter((d) => d.classe === "essencial")
    .reduce((s, d) => s + d.valorMensal, 0);
}

/** Monthly debt service today (month 1 of each liability's remaining term). */
export function servicoDividaMensal(c: PlanningCase): number {
  let total = 0;
  for (const l of c.liabilities.itens) {
    if (l.prazoMeses > 0 && l.saldoDevedor > 0) {
      const iM = annualToMonthly(l.taxaEfetivaAA);
      if (l.sistema === "PRICE") {
        total += (l.saldoDevedor * iM) / (1 - Math.pow(1 + iM, -l.prazoMeses)) || l.saldoDevedor / l.prazoMeses;
      } else {
        total += l.saldoDevedor / l.prazoMeses + l.saldoDevedor * iM;
      }
    }
  }
  return total;
}

/** Monthly surplus = recurring income − expenses − debt service. */
export function sobraMensal(c: PlanningCase): number {
  return rendaMensalRecorrente(c) - despesaMensalTotal(c) - servicoDividaMensal(c);
}

/* ----------------------------------------------------------- patrimônio */

export function patrimonioBruto(c: PlanningCase): number {
  return c.assets.itens.reduce((s, a) => s + a.valor, 0);
}

export function porClasse(c: PlanningCase, classe: string): number {
  return c.assets.itens.filter((a) => a.classe === classe).reduce((s, a) => s + a.valor, 0);
}

/* -------------------------------------------------------------- reserva */

/** Reserva de emergência = multiplicador × despesas essenciais mensais. */
export function alvoReserva(c: PlanningCase, a: Assumptions, multiplicador?: 6 | 12): number {
  const mult = multiplicador ?? a.multiplicadorReservaDefault;
  return mult * despesaMensalEssencial(c);
}

/* ------------------------------------------------------------- sucessão */

/** Sucessão = max(0, pct × patrimônio bruto − previdência − seguros). */
export function alvoSucessao(c: PlanningCase, a: Assumptions): number {
  const bruto = patrimonioBruto(c);
  const previdencia = porClasse(c, "previdencia");
  const seguros = porClasse(c, "seguro");
  return Math.max(0, a.percentualSucessao * bruto - previdencia - seguros);
}

/* --------------------------------------------------------- aposentadoria */

/** Target monthly income in retirement BEFORE INSS/continuing income.
 *  Modo "percentual" applies the % to the CURRENT recurring income (today's
 *  values, real terms) — não projeta crescimento até a aposentadoria
 *  (decisão documentada; a projeção honra crescimento nos FLUXOS). */
export function rendaAlvoAposentadoriaBruta(c: PlanningCase): number {
  const ra = c.incomes.rendaAposentadoria;
  if (!ra) return 0.7 * rendaMensalRecorrente(c); // default 70% (premissa ilustrativa)
  if (ra.modo === "valor") return Math.max(0, ra.valor);
  return Math.max(0, (ra.valor / 100) * rendaMensalRecorrente(c));
}

/** STATIC estimate of monthly income that keeps flowing in retirement (INSS +
 *  flagged incomes, annualized by mesesPorAno). Used for capital TARGETS only;
 *  the projection derives the real gap month by month from the actual flows
 *  (ateAno, growth and 13º honored there). */
export function rendaContinuaAposentadoria(c: PlanningCase): number {
  const ra = c.incomes.rendaAposentadoria;
  const inss = ra?.flagINSS ? (ra.valorINSSMensal ?? 0) : 0;
  const continuas = c.incomes.recorrentes
    .filter((r) => r.continuaNaAposentadoria)
    .reduce((s, r) => s + (r.valorMensal * (r.mesesPorAno ?? 12)) / 12, 0);
  return inss + continuas;
}

/** Net monthly income gap the portfolio must fund in retirement (≥ 0). */
export function rendaAlvoMensalLiquida(c: PlanningCase): number {
  return Math.max(0, rendaAlvoAposentadoriaBruta(c) - rendaContinuaAposentadoria(c));
}

/**
 * Capital needed at retirement for the chosen method (C8):
 *  - depletion: PV of a real annuity until `longevidadeAnos` (conta centenária)
 *  - preservation/perpetuity: capital whose REAL return funds the income forever
 *    (renda anual / retorno real).
 */
export function capitalNecessarioAposentadoria(
  c: PlanningCase,
  a: Assumptions,
  retornoRealAA: number,
  metodo = a.metodoAposentadoria,
): number {
  const gapMensal = rendaAlvoMensalLiquida(c);
  if (gapMensal <= 0) return 0;
  const iM = annualToMonthly(retornoRealAA);
  if (metodo === "depletion") {
    const mesesUsufruto = Math.max(0, (a.longevidadeAnos - c.profile.idadeUsufruto) * 12);
    return pvAnnuity(gapMensal, iM, mesesUsufruto, a.timingAportes);
  }
  // preservation / perpetuity: perpetuidade REAL na mesma granularidade
  // mensal da desacumulação — capital × i_m = gap mensal.
  if (iM <= 0) return Number.POSITIVE_INFINITY;
  return gapMensal / iM;
}
