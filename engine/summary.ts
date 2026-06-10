/**
 * Vision Engine — resumo comparável de um plano (v5).
 *
 * KPIs determinísticos derivados de project() para o modal "Resumo dos
 * Planos" (comparação de cenários A/B/C). Funções puras; precisão total
 * (C10 — arredondamento só na exibição).
 */
import { resolveAssumptions } from "./assumptions";
import { project } from "./projection";
import { despesaMensalEssencial } from "./rules";
import type { PlanningCase, Projection } from "./types";

export interface PlanSummaryKPIs {
  anoAposentadoria: number;
  /** Último ano projetado (horizonte/longevidade) — o ano da herança. */
  anoLongevidade: number;
  patrimonioNaAposentadoria: number;
  /** Primeiro ano em que o patrimônio líquido zera ANTES da longevidade; null = nunca esgota. */
  anoEsgotamento: number | null;
  /** Média mensal das ENTRADAS na desacumulação (contínuas + INSS + saques + eventos de entrada). */
  rendaMediaAposentadoriaMensal: number;
  /** Renda média anual no usufruto − despesas essenciais anuais; < 0 = gap. */
  gapRendaEssencialAnual: number;
  /** Patrimônio remanescente no ano-limite do plano (estate na longevidade). */
  herancaNaLongevidade: number;
}

export interface PlanSummaryDelta {
  anoAposentadoria: number;
  patrimonioNaAposentadoria: number;
  /** Diferença em ANOS de esgotamento; null quando ref e cenário nunca esgotam. */
  anoEsgotamento: number | null;
  rendaMediaAposentadoriaMensal: number;
  gapRendaEssencialAnual: number;
  herancaNaLongevidade: number;
}

/** KPIs de resumo de um caso (deriva de project(); aceita projeção pré-computada). */
export function summarize(c: PlanningCase, proj?: Projection): PlanSummaryKPIs {
  const p = proj ?? project(c);
  const a = resolveAssumptions(c);

  const anosUsufruto = p.anos.filter((l) => l.fase === "desacumulacao");
  const somaEntradas = anosUsufruto.reduce((s, l) => s + l.entradas, 0);
  const rendaMediaMensal = anosUsufruto.length ? somaEntradas / (anosUsufruto.length * 12) : 0;

  const essenciaisAnuais = despesaMensalEssencial(c) * 12;
  const idadeEsgotamento = p.resumo.idadeEsgotamento;
  const anoEsgotamento =
    idadeEsgotamento !== null && idadeEsgotamento < a.longevidadeAnos
      ? a.anoBase + (idadeEsgotamento - c.profile.idadeAtual)
      : null;

  return {
    anoAposentadoria: p.resumo.anoAposentadoria,
    anoLongevidade: p.anos.length ? p.anos[p.anos.length - 1].ano : a.anoBase,
    patrimonioNaAposentadoria: p.resumo.patrimonioNaAposentadoria,
    anoEsgotamento,
    rendaMediaAposentadoriaMensal: rendaMediaMensal,
    gapRendaEssencialAnual: rendaMediaMensal * 12 - essenciaisAnuais,
    herancaNaLongevidade: p.resumo.patrimonioFinal,
  };
}

/** Deltas de cada cenário versus a referência (cenário − referência). */
export function compare(
  ref: PlanningCase,
  outros: PlanningCase[],
): { referencia: PlanSummaryKPIs; cenarios: { kpis: PlanSummaryKPIs; delta: PlanSummaryDelta }[] } {
  const referencia = summarize(ref);
  const cenarios = outros.map((c) => {
    const kpis = summarize(c);
    return { kpis, delta: deltaKPIs(referencia, kpis) };
  });
  return { referencia, cenarios };
}

export function deltaKPIs(ref: PlanSummaryKPIs, k: PlanSummaryKPIs): PlanSummaryDelta {
  // anoLongevidade é descritivo (horizonte) — fica fora dos deltas.
  return {
    anoAposentadoria: k.anoAposentadoria - ref.anoAposentadoria,
    patrimonioNaAposentadoria: k.patrimonioNaAposentadoria - ref.patrimonioNaAposentadoria,
    anoEsgotamento:
      k.anoEsgotamento === null && ref.anoEsgotamento === null
        ? null
        : (k.anoEsgotamento ?? Number.POSITIVE_INFINITY) === Number.POSITIVE_INFINITY &&
            ref.anoEsgotamento !== null
          ? null // cenário deixou de esgotar — melhora qualitativa, sem delta numérico
          : (k.anoEsgotamento ?? 0) - (ref.anoEsgotamento ?? 0),
    rendaMediaAposentadoriaMensal: k.rendaMediaAposentadoriaMensal - ref.rendaMediaAposentadoriaMensal,
    gapRendaEssencialAnual: k.gapRendaEssencialAnual - ref.gapRendaEssencialAnual,
    herancaNaLongevidade: k.herancaNaLongevidade - ref.herancaNaLongevidade,
  };
}
