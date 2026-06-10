/**
 * Peer insights — "o que pessoas como você estão planejando?" (v5).
 *
 * REGRA ZERO: todo número exibido vem do dataset curado ou de cálculo local
 * sobre os totais do caso (motor/heurística). Nenhuma IA nesta feature; nada
 * sai do app. As estatísticas de relevância são ILUSTRATIVAS (fontes a
 * validar com compliance antes de uso externo).
 */
import type { LifeEvent, Segment } from "@/lib/types";

export type FaixaEtaria = "18-29" | "30-40" | "41-55" | "56+";
export type ComposicaoFamiliar = "solteiro" | "casal" | "familia";

/** Anonymized profile summary the provider keys suggestions on. */
export interface PerfilResumo {
  segmento: Segment;
  faixaEtaria: FaixaEtaria;
  /** Recurring monthly income (BRL) — drives faixa label + local calcs. */
  rendaMensal: number;
  composicao: ComposicaoFamiliar;
}

export type CalculoSugestao = "pctRendaAnual" | "multiploRendaAnual" | "valorDataset";

export interface PeerInsight {
  id: string;
  /** Pain-connected question title (i18n key suffix under peer.cards). */
  perguntaTitulo: string;
  /** Icon name from the app barrel. */
  icone: string;
  relevancia: {
    /** Big anchor stat, e.g. "1 em 8" — ILLUSTRATIVE, source to validate. */
    statDestaque: string;
    statTexto: string;
  };
  sugestao: {
    /** Template with a {valor} slot, filled by the LOCAL calculation. */
    templateTexto: string;
    calculo: CalculoSugestao;
    /** pctRendaAnual: fraction of annual income · multiploRendaAnual: ×années · valorDataset: ignored. */
    parametro: number;
    /** Typical BRL value per segment (used by "valorDataset" and as the categoria tip). */
    valorPorSegmento: Record<Segment, number>;
  };
  provaSocial: { de10: number };
  /** Pre-filled event the card creates (year is an offset from today). */
  eventoTemplate: Partial<LifeEvent> & { presetKey: string; kind: LifeEvent["kind"]; anosAteEvento: number };
  /** Which profiles this insight targets (empty = everyone). */
  alvo?: { faixas?: FaixaEtaria[]; composicoes?: ComposicaoFamiliar[] };
}

export interface PeerInsightsProvider {
  getInsights(perfil: PerfilResumo): PeerInsight[];
}
