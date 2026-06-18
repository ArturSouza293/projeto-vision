import { describe, expect, it } from "vitest";

import { cartaoGastos, cartaoShare, cartaoTotal } from "@/lib/cartao";
import { KYC_DOSSIERS } from "@/lib/mock/kyc";
import type { KYCCartao } from "@/lib/types";

const comCategorias: KYCCartao = {
  gastoMedioMensal: 4500,
  cartoes: ["Bradesco Visa Infinite"],
  gastosPorCategoria: [
    { categoria: "living", valor: 1600 },
    { categoria: "health", valor: 800 },
    { categoria: "lifestyle", valor: 1400 },
    { categoria: "other", valor: 700 },
  ],
};

const semCategorias: KYCCartao = {
  gastoMedioMensal: 2800,
  cartoes: ["Bradesco Elo"],
};

describe("lib/cartao (C4 — planilha de gastos do cartão)", () => {
  it("soma as categorias quando existem", () => {
    expect(cartaoTotal(comCategorias)).toBe(4500);
  });

  it("o total da planilha bate com o gasto médio (consistência do mock)", () => {
    expect(cartaoTotal(comCategorias)).toBe(comCategorias.gastoMedioMensal);
  });

  it("cai no gasto médio quando não há planilha por categoria", () => {
    expect(cartaoTotal(semCategorias)).toBe(2800);
  });

  it("ordena as linhas do maior gasto para o menor", () => {
    const linhas = cartaoGastos(comCategorias);
    expect(linhas.map((l) => l.categoria)).toEqual(["living", "lifestyle", "health", "other"]);
    // não muta o array original
    expect(comCategorias.gastosPorCategoria![0].categoria).toBe("living");
  });

  it("calcula a participação de cada linha sobre o total", () => {
    expect(cartaoShare(comCategorias, 1600)).toBeCloseTo(1600 / 4500, 6);
    expect(cartaoShare(semCategorias, 2800)).toBeCloseTo(1, 6);
  });

  // Integridade dos mocks: a planilha por categoria precisa reconciliar com o
  // gasto médio exibido em A3 (vision360.avgSpend) — senão "Total no cartão"
  // contradiz o "Gasto médio" na mesma tela.
  it("em TODO dossiê com planilha, a soma das categorias == gastoMedioMensal", () => {
    const comPlanilha = Object.entries(KYC_DOSSIERS).filter(
      ([, k]) => (k.fluxoCaixa?.cartao?.gastosPorCategoria?.length ?? 0) > 0,
    );
    expect(comPlanilha.length).toBeGreaterThan(0); // garante que o caso é exercido
    for (const [id, k] of comPlanilha) {
      const cartao = k.fluxoCaixa!.cartao!;
      expect(cartaoTotal(cartao), `cartão de ${id}`).toBe(cartao.gastoMedioMensal);
    }
  });
});
