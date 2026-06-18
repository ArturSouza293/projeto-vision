/**
 * v10 C4 — agregação da planilha de gastos do cartão (mock, via Open Finance).
 *
 * REGRA ZERO: a soma/ordenação vive aqui (lib), não no componente. É exibição
 * de valores-mock do KYC — NÃO entra no `cashFlow` do plano (sem dupla contagem)
 * nem alimenta o motor de projeção.
 */
import type { CartaoGastoCategoria, KYCCartao } from "@/lib/types";

/** Linhas da planilha ordenadas do maior gasto para o menor. */
export function cartaoGastos(cartao: KYCCartao): CartaoGastoCategoria[] {
  return [...(cartao.gastosPorCategoria ?? [])].sort((a, b) => b.valor - a.valor);
}

/**
 * Total da planilha. Se há categorias, soma-as; senão, cai no `gastoMedioMensal`
 * (descritivo). Mantido consistente com o gasto médio nos mocks.
 */
export function cartaoTotal(cartao: KYCCartao): number {
  const itens = cartao.gastosPorCategoria;
  if (!itens || itens.length === 0) return cartao.gastoMedioMensal;
  return itens.reduce((s, g) => s + g.valor, 0);
}

/** Participação (0..1) de uma linha sobre o total — para a barrinha de leitura. */
export function cartaoShare(cartao: KYCCartao, valor: number): number {
  const total = cartaoTotal(cartao);
  return total > 0 ? valor / total : 0;
}
