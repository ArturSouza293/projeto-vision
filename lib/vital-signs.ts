/**
 * C11 — Próximo passo por SINAL VITAL (modelo Prime Top Tier).
 *
 * Quando a lacuna de usufruto/aposentadoria é negativa, deixamos de só MOSTRAR e
 * passamos a SUGERIR o próximo passo, escolhendo a(s) alavanca(s) coerente(s)
 * com o sinal vital *binding*. Função PURA e plugável: recebe os sinais + as
 * MAGNITUDES já calculadas pelo MOTOR (Regra Zero — nada de número novo aqui) e
 * devolve recomendações ordenadas. A UI traduz o título e oferece o CTA
 * "simular este ajuste" que abre o cenário com a alavanca aplicada.
 *
 * Honestidade: a matriz Prime Top Tier é o MODELO DE CÁLCULO (alavancas), não um
 * mapa literal "sinal → script/produto". Aqui implementamos as 6 alavancas.
 */

export type AlavancaId =
  | "aporte" // ↑ Disciplina Mensal / Capacidade de Poupança
  | "adiar_usufruto" // ↑ Prazo até aposentadoria
  | "padrao_vida" // ↓ renda-alvo (Padrão de Vida)
  | "perfil_retorno" // revisar perfil/retorno (dentro do suitability)
  | "alocar_existente" // alocar Investimentos/Previdência existentes (aporte único)
  | "protecao_sucessao"; // Proteção (seguros) + Inventário/Sucessão (liquidez)

export interface SinaisVitais {
  /** Lacuna mensal a cobrir (R$/mês). > 0 = falta; ≤ 0 = sem lacuna. */
  lacunaMensal: number;
  /** Probabilidade de sucesso 0..100. */
  probabilidade: number;
  /** Horizonte (anos) até o usufruto. */
  horizonteAnos: number;
  /** Perfil conservador demais para um horizonte longo. */
  perfilConservadorLongoPrazo: boolean;
  /** Espólio/legado descoberto (proteção/sucessão insuficiente). */
  espolioDescoberto: boolean;
  objetivosAtingiveis: number;
  objetivosTotais: number;
}

/** Magnitudes vindas do MOTOR (null = "mostrar efeito ao simular"). */
export interface MagnitudesMotor {
  /** R$/mês adicional para zerar a lacuna (respeitando o teto da sobra). */
  deltaAporteParaZerar: number | null;
  /** Anos para adiar o usufruto (inverse-solve). */
  anosParaAdiar: number | null;
  /** Quanto reduzir a renda-alvo (Padrão de Vida) para caber. */
  reducaoRendaAlvoMensal: number | null;
  /** Aporte único disponível alocando Investimentos/Previdência existentes. */
  aporteUnicoDisponivel: number | null;
}

export type UnidadeMagnitude = "BRL/mês" | "anos" | "BRL";

export interface Recomendacao {
  alavanca: AlavancaId;
  magnitude: number | null;
  unidade: UnidadeMagnitude;
  /** Alavanca prioritária para o sinal vital binding. */
  binding: boolean;
}

/** A alavanca prioritária dado o sinal vital *binding*. */
export function alavancaBinding(s: SinaisVitais): AlavancaId {
  if (s.espolioDescoberto) return "protecao_sucessao";
  if (s.horizonteAnos <= 5) return "adiar_usufruto"; // horizonte curto
  if (s.perfilConservadorLongoPrazo && s.probabilidade < 70) return "perfil_retorno";
  return "aporte"; // caso geral: Disciplina Mensal
}

/**
 * Recomendações ordenadas (binding primeiro; depois as que têm magnitude do
 * motor). Lacuna ≤ 0 ⇒ lista vazia (nada a fazer).
 */
export function nextStepFromVitalSign(s: SinaisVitais, m: MagnitudesMotor): Recomendacao[] {
  if (s.lacunaMensal <= 0) return [];
  const primary = alavancaBinding(s);
  const recs: Recomendacao[] = [
    { alavanca: "aporte", magnitude: m.deltaAporteParaZerar, unidade: "BRL/mês", binding: false },
    { alavanca: "adiar_usufruto", magnitude: m.anosParaAdiar, unidade: "anos", binding: false },
    { alavanca: "padrao_vida", magnitude: m.reducaoRendaAlvoMensal, unidade: "BRL/mês", binding: false },
    { alavanca: "perfil_retorno", magnitude: null, unidade: "BRL/mês", binding: false },
    { alavanca: "alocar_existente", magnitude: m.aporteUnicoDisponivel, unidade: "BRL", binding: false },
  ];
  if (s.espolioDescoberto) {
    recs.push({ alavanca: "protecao_sucessao", magnitude: null, unidade: "BRL", binding: false });
  }
  for (const r of recs) r.binding = r.alavanca === primary;
  return recs.sort(
    (a, b) =>
      Number(b.binding) - Number(a.binding) ||
      Number(b.magnitude != null) - Number(a.magnitude != null),
  );
}
