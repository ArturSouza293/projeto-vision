import { describe, expect, it } from "vitest";

import { DEFAULT_ASSUMPTIONS } from "../assumptions";
import { annualToMonthly } from "../mathcore";
import { alvoSucessao } from "../rules";
import type { Assumptions, PlanningCase } from "../types";

const A: Assumptions = { ...DEFAULT_ASSUMPTIONS, anoBase: 2026 };

function caso(): PlanningCase {
  return {
    profile: { idadeAtual: 60, idadeUsufruto: 65 },
    incomes: { recorrentes: [] },
    expenses: { itens: [] },
    assets: {
      itens: [
        { nome: "líquido", valor: 2_000_000, classe: "liquidez" },
        { nome: "imóveis", valor: 3_000_000, classe: "imovel" },
        { nome: "VGBL", valor: 500_000, classe: "previdencia" },
      ],
    },
    liabilities: { itens: [] },
    goals: [],
  };
}

describe("C9 — subtipos de sucessão (alvoSucessao)", () => {
  it("default (sem subtipo) = fórmula histórica — golden-safe", () => {
    const c = caso();
    // 20% × 5.500.000 − 500.000 prev − 0 seguro = 1.100.000 − 500.000 = 600.000
    expect(alvoSucessao(c, A)).toBe(600_000);
    expect(alvoSucessao(c, A, "inventario")).toBe(600_000);
  });

  it('"imoveis": inventário só sobre os imóveis', () => {
    // 20% × 3.000.000 = 600.000 (sem abater previdência; só seguros)
    expect(alvoSucessao(caso(), A, "imoveis")).toBe(600_000);
  });

  it('"legado": soma o capital que perpetua a renda do herdeiro', () => {
    const renda = 10_000;
    const iM = annualToMonthly(A.retornosReaisAA[A.perfilRetorno]);
    const capitalLegado = renda / iM;
    const esperado = 0.2 * 5_500_000 + capitalLegado - 500_000;
    expect(alvoSucessao(caso(), A, "legado", { rendaLegadoMensal: renda })).toBeCloseTo(
      esperado,
      4,
    );
  });

  it('"legado" sem renda informada cai no comportamento default', () => {
    expect(alvoSucessao(caso(), A, "legado")).toBe(600_000);
  });
});
