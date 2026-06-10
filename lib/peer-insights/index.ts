/**
 * Peer insights — provider mock + cálculos LOCAIS (Regra Zero: dataset curado
 * + heurística sobre os totais do caso; nenhuma IA, nada sai do app).
 */
import { ageFromDob, recurringMonthlyIncome } from "@/lib/calc";
import type { LifeEvent, Plan } from "@/lib/types";

import { PEER_INSIGHTS_DATASET } from "./dataset";
import type {
  ComposicaoFamiliar,
  FaixaEtaria,
  PeerInsight,
  PeerInsightsProvider,
  PerfilResumo,
} from "./types";

export * from "./types";

/* ------------------------------------------------------------- perfil */

export function perfilFromPlan(plan: Plan): PerfilResumo {
  const idade = ageFromDob(plan.clientProfile.dateOfBirth);
  const faixaEtaria: FaixaEtaria =
    idade < 30 ? "18-29" : idade <= 40 ? "30-40" : idade <= 55 ? "41-55" : "56+";
  const composicao: ComposicaoFamiliar =
    (plan.clientProfile.dependents ?? 0) > 0
      ? "familia"
      : plan.clientProfile.hasPartner
        ? "casal"
        : "solteiro";
  return {
    segmento: plan.clientProfile.segment,
    faixaEtaria,
    rendaMensal: recurringMonthlyIncome(plan.cashFlow),
    composicao,
  };
}

/* ----------------------------------------------------------- provider */

/** Mock curado: filtra por alvo do perfil e ordena por prova social (desc). */
export const mockPeerInsightsProvider: PeerInsightsProvider = {
  getInsights(perfil) {
    return PEER_INSIGHTS_DATASET.filter((i) => {
      if (i.alvo?.faixas && !i.alvo.faixas.includes(perfil.faixaEtaria)) return false;
      if (i.alvo?.composicoes && !i.alvo.composicoes.includes(perfil.composicao)) return false;
      return true;
    }).sort((a, b) => b.provaSocial.de10 - a.provaSocial.de10);
  },
};

/** Swap point: trocar o mock por uma fonte real (base anonimizada do banco)
 *  sem tocar a UI. */
export const peerInsightsProvider: PeerInsightsProvider = mockPeerInsightsProvider;

/* ------------------------------------------------------------ cálculos */

/** Valor sugerido do card, calculado LOCALMENTE a partir do caso. */
export function insightValue(insight: PeerInsight, perfil: PerfilResumo): number {
  const rendaAnual = perfil.rendaMensal * 12;
  switch (insight.sugestao.calculo) {
    case "pctRendaAnual":
      return Math.round(insight.sugestao.parametro * rendaAnual);
    case "multiploRendaAnual":
      return Math.round(insight.sugestao.parametro * rendaAnual);
    case "valorDataset":
      return insight.sugestao.valorPorSegmento[perfil.segmento];
  }
}

/** Dica de categoria na aba "Criar do zero": teto típico do perfil no dataset. */
export function categoriaTipValue(presetKey: string, perfil: PerfilResumo): number | null {
  const candidatos = PEER_INSIGHTS_DATASET.filter((i) => i.eventoTemplate.presetKey === presetKey);
  if (!candidatos.length) return null;
  return Math.max(...candidatos.map((i) => insightValue(i, perfil)));
}

/** Evento pré-preenchido (e totalmente editável) que um card selecionado vira. */
export function eventoFromInsight(
  insight: PeerInsight,
  perfil: PerfilResumo,
  label: string,
  thisYear: number,
): Omit<LifeEvent, "id"> {
  const { presetKey, kind, anosAteEvento, recurring, endYear } = insight.eventoTemplate;
  const year = thisYear + anosAteEvento;
  return {
    presetKey,
    label,
    kind,
    year,
    amount: insightValue(insight, perfil),
    recurring,
    endYear: recurring && endYear === undefined ? year + 3 : endYear,
  };
}
