/**
 * Vision Engine — ITCMD (Imposto de Transmissão Causa Mortis e Doação). C5.
 *
 * A alíquota varia por UF (1%–8%, algumas progressivas). Os valores aqui são
 * ILUSTRATIVOS e PARAMETRIZÁVEIS — não substituem a tabela vigente da Secretaria
 * de Fazenda de cada estado (igual à disciplina de "não fabricar parâmetro":
 * o número é marcado `ilustrativo` e deve ser confirmado antes de uso real).
 *
 * Função PURA (Regra Zero): recebe a base e a UF; o domínio injeta os params.
 */

export interface ITCMDParams {
  /** Alíquota efetiva (fração) por UF — ilustrativa, parametrizável. */
  aliquotaPorUF: Record<string, number>;
  /** Alíquota usada quando a UF é desconhecida. */
  padrao: number;
  /** Marcador de origem (exibido como "ilustrativo" na UI). */
  ilustrativo: true;
}

/**
 * Tabela ILUSTRATIVA por UF (efetiva aproximada; estados progressivos
 * representados por uma alíquota média). CONFIRMAR na SEFAZ antes de produção.
 */
export const ITCMD_ILUSTRATIVO: ITCMDParams = {
  padrao: 0.04,
  ilustrativo: true,
  aliquotaPorUF: {
    AC: 0.04, AL: 0.04, AP: 0.04, AM: 0.02, BA: 0.08, CE: 0.08, DF: 0.06,
    ES: 0.04, GO: 0.04, MA: 0.04, MT: 0.04, MS: 0.06, MG: 0.05, PA: 0.04,
    PB: 0.08, PR: 0.04, PE: 0.08, PI: 0.06, RJ: 0.045, RN: 0.06, RS: 0.06,
    RO: 0.04, RR: 0.04, SC: 0.07, SP: 0.04, SE: 0.08, TO: 0.04,
  },
};

/** Alíquota ITCMD ilustrativa para a UF (fração). UF desconhecida → padrão. */
export function aliquotaITCMD(uf: string | undefined, params: ITCMDParams = ITCMD_ILUSTRATIVO): number {
  const key = (uf ?? "").trim().toUpperCase();
  return params.aliquotaPorUF[key] ?? params.padrao;
}

/**
 * ITCMD estimado (ilustrativo) sobre uma base de transmissão (≥ 0). Útil para
 * dimensionar a LIQUIDEZ sucessória (evitar venda forçada de bens).
 */
export function itcmdEstimado(
  baseTransmissao: number,
  uf: string | undefined,
  params: ITCMDParams = ITCMD_ILUSTRATIVO,
): number {
  return Math.max(0, baseTransmissao) * aliquotaITCMD(uf, params);
}
