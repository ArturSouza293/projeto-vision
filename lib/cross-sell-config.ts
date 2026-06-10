/**
 * v7 — parâmetros de pertinência e ranqueamento do cross-sell.
 *
 * DECISÃO DE NEGÓCIO VISÍVEL (espelho das premissas do motor): nada disto é
 * número mágico dentro de regra — confirmado com o usuário em 2026-06:
 * limiar 20% da renda anual · janela 5 anos com decaimento linear ·
 * consórcio/financiamento planejado ofertável como CATEGORIA · teto 5.
 */
export const CROSS_SELL_CONFIG = {
  /** Evento abaixo deste % da RENDA ANUAL não gera oportunidade (anti-spam). */
  limiarPctRendaAnual: 0.2,

  /** Eventos nos próximos N anos pesam mais; decaimento linear até N. */
  janelaAnos: 5,
  /** Peso mínimo de proximidade após a janela (nunca zera — só rebaixa). */
  pesoMinimoJanela: 0.2,

  /** Máximo de oportunidades EXIBIDAS ranqueadas; demais em "ver todas". */
  tetoExibicao: 5,

  /**
   * Fatores somados ao score-base (FIT_BASE + boost log de valor, regra
   * existente). Explicáveis: pontos máximos por fator.
   */
  pesos: {
    /** Até +18 pontos para eventos no curtíssimo prazo (decai com a janela). */
    proximidade: 18,
    /** Até +14 pontos conforme o valor se aproxima de 1× a renda anual. */
    valorRelativo: 14,
  },

  /** Saída próxima cujo aporte não cabe na sobra → alternativa de crédito. */
  janelaFinanciamentoAnos: 5,

  /** Suitability × alocação implícita (B2): gatilhos de realocação. */
  realocacao: {
    /** Conservador com mais de X% do investível em renda variável/risco. */
    maxRiscoConservador: 0.5,
    /** Agressivo com mais de X% do investível parado em caixa. */
    maxCaixaAgressivo: 0.5,
  },

  /** Titularidade concentrada (B2): % dos ativos num único titular. */
  concentracaoTitularidade: 0.7,
} as const;
