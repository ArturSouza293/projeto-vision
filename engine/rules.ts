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

/**
 * Liquidez-alvo de sucessão. Varia por SUBTIPO (C9) — golden-safe: sem subtipo,
 * idêntico ao histórico `max(0, pct × bruto − previdência − seguros)`.
 *  - undefined/"inventario": custo de inventário/ITCMD sobre o patrimônio bruto;
 *  - "imoveis" (deixar só imóveis): inventário SÓ sobre os imóveis;
 *  - "legado" (renda vitalícia ao herdeiro): inventário + capital que perpetua a
 *    `rendaLegadoMensal` (perpetuidade real), tudo abatido por previdência/seguros.
 */
export function alvoSucessao(
  c: PlanningCase,
  a: Assumptions,
  subtipo?: "inventario" | "imoveis" | "legado",
  opts?: { rendaLegadoMensal?: number; retornoRealAA?: number },
): number {
  const previdencia = porClasse(c, "previdencia");
  const seguros = porClasse(c, "seguro");
  if (subtipo === "imoveis") {
    return Math.max(0, a.percentualSucessao * porClasse(c, "imovel") - seguros);
  }
  const inventario = a.percentualSucessao * patrimonioBruto(c);
  if (subtipo === "legado" && opts?.rendaLegadoMensal && opts.rendaLegadoMensal > 0) {
    const iM = annualToMonthly(opts.retornoRealAA ?? a.retornosReaisAA[a.perfilRetorno]);
    const capitalLegado = iM > 0 ? opts.rendaLegadoMensal / iM : Number.POSITIVE_INFINITY;
    return Math.max(0, inventario + capitalLegado - previdencia - seguros);
  }
  return Math.max(0, inventario - previdencia - seguros);
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
  return capitalParaRendaMensal(rendaAlvoMensalLiquida(c), c, a, retornoRealAA, metodo);
}

/**
 * Horizonte da renda de usufruto, em MESES. Custom (`horizonteRendaAnos`,
 * permite renda além da longevidade do titular — ex.: 50 anos pós-morte para um
 * dependente "maior incapaz") ou, na ausência, (longevidade − idadeUsufruto).
 * Golden-safe: sem override, idêntico à expressão histórica.
 */
export function horizonteUsufrutoMeses(c: PlanningCase, a: Assumptions): number {
  const anos = c.profile.horizonteRendaAnos ?? a.longevidadeAnos - c.profile.idadeUsufruto;
  return Math.max(0, anos * 12);
}

/**
 * Capital necessário para sustentar uma renda mensal-alvo (líquida) arbitrária —
 * base do pré-preenchimento BIDIRECIONAL do objetivo de usufruto (C8):
 *  - depletion: VP de uma anuidade real pelo horizonte (conta/horizonte custom);
 *  - preservation/perpetuity: capital cujo retorno real paga a renda para sempre.
 */
export function capitalParaRendaMensal(
  rendaMensalLiquida: number,
  c: PlanningCase,
  a: Assumptions,
  retornoRealAA: number,
  metodo = a.metodoAposentadoria,
): number {
  if (rendaMensalLiquida <= 0) return 0;
  const iM = annualToMonthly(retornoRealAA);
  if (metodo === "depletion") {
    return pvAnnuity(rendaMensalLiquida, iM, horizonteUsufrutoMeses(c, a), a.timingAportes);
  }
  if (iM <= 0) return Number.POSITIVE_INFINITY;
  return rendaMensalLiquida / iM;
}

/**
 * Direção INVERSA (C8): renda mensal sustentável por um dado capital. Permite
 * "preencher capital → derivar renda". É o inverso exato de
 * {@link capitalParaRendaMensal} (round-trip ≈ identidade).
 */
export function rendaSustentavelMensal(
  capital: number,
  c: PlanningCase,
  a: Assumptions,
  retornoRealAA: number,
  metodo = a.metodoAposentadoria,
): number {
  if (capital <= 0) return 0;
  const iM = annualToMonthly(retornoRealAA);
  if (metodo === "depletion") {
    const fator = pvAnnuity(1, iM, horizonteUsufrutoMeses(c, a), a.timingAportes);
    return fator > 0 ? capital / fator : 0;
  }
  return capital * iM; // perpetuity/preservation
}
