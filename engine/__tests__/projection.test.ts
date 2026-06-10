/** Projeção mensal — invariantes estruturais (C1, C4, C8). */
import { describe, expect, it } from "vitest";

import { project } from "../projection";
import type { PlanningCase } from "../types";
import { ANO_BASE, baseCase } from "./helpers";

/** Case onde TODO o fluxo de caixa é capturado pelo patrimônio (aporte = sobra). */
function fullCaptureCase(overrides: Partial<PlanningCase> = {}): PlanningCase {
  return baseCase({
    profile: { idadeAtual: 40, idadeUsufruto: 100 }, // só acumulação
    incomes: { recorrentes: [{ nome: "Salário", valorMensal: 1000 }] },
    expenses: { itens: [{ nome: "Custo", valorMensal: 400, classe: "essencial" }] },
    assets: { itens: [{ nome: "Caixa", valor: 50000, classe: "liquidez", retornoRealAA: 0 }] },
    planParams: { aporteMensal: 600, retornoRealAAOverride: 0 },
    lifeEvents: [
      { id: "e1", tipo: "saida", valor: 10000, ano: ANO_BASE + 3, mes: 6 },
      { id: "e2", tipo: "entrada", valor: 5000, ano: ANO_BASE + 5, mes: 2 },
    ],
    ...overrides,
  });
}

describe("invariante: retorno 0 + inflação 0 → final = inicial + Σentradas − Σsaídas", () => {
  it("fecha exato no horizonte de acumulação", () => {
    const p = project(fullCaptureCase());
    const somaEntradas = p.anos.reduce((s, l) => s + l.entradas, 0);
    const somaSaidas = p.anos.reduce((s, l) => s + l.saidas, 0);
    const esperado = p.resumo.patrimonioInicial + somaEntradas - somaSaidas;
    expect(Math.abs(p.resumo.patrimonioFinal - esperado)).toBeLessThan(1e-6);
  });
});

describe("C4 — nominal deflacionado ≡ real (sem vazamento de modo)", () => {
  it("patrimônio nominal / fator de inflação = patrimônio real, ano a ano", () => {
    const real = project(baseCase());
    const nominal = project(baseCase({ assumptions: { anoBase: ANO_BASE, modoProjecao: "nominal", inflacaoAA: 0.04 } }));
    expect(nominal.anos.length).toBe(real.anos.length);
    for (let k = 0; k < real.anos.length; k++) {
      const fator = Math.pow(1.04, real.anos[k].ano - ANO_BASE + 1);
      expect(Math.abs(nominal.anos[k].patrimonio / fator - real.anos[k].patrimonio)).toBeLessThan(1e-6);
      expect(Math.abs(nominal.anos[k].saldoCaixa / fator - real.anos[k].saldoCaixa)).toBeLessThan(1e-6);
    }
  });

  it("inflação 0 → nominal idêntico ao real", () => {
    const real = project(baseCase());
    const nominal = project(baseCase({ assumptions: { anoBase: ANO_BASE, modoProjecao: "nominal", inflacaoAA: 0 } }));
    expect(JSON.stringify(nominal.anos)).toBe(JSON.stringify(real.anos));
  });
});

describe("C1 — motor mensal de verdade", () => {
  it("evento em dezembro ≠ evento em janeiro (capitalização intra-ano)", () => {
    const dez = project(fullCaptureCase({
      planParams: { aporteMensal: 600, retornoRealAAOverride: 0.06 },
      lifeEvents: [{ id: "e", tipo: "entrada", valor: 100000, ano: ANO_BASE + 1, mes: 12 }],
    }));
    const jan = project(fullCaptureCase({
      planParams: { aporteMensal: 600, retornoRealAAOverride: 0.06 },
      lifeEvents: [{ id: "e", tipo: "entrada", valor: 100000, ano: ANO_BASE + 1, mes: 1 }],
    }));
    const anoDez = dez.anos.find((l) => l.ano === ANO_BASE + 1)!;
    const anoJan = jan.anos.find((l) => l.ano === ANO_BASE + 1)!;
    // January money compounds ~11 extra months inside the year.
    expect(anoJan.patrimonio).toBeGreaterThan(anoDez.patrimonio);
    expect(anoJan.patrimonio - anoDez.patrimonio).toBeGreaterThan(100);
  });

  it("13º (mesesPorAno: 13) aparece só em dezembro e soma 13 salários/ano", () => {
    const c = fullCaptureCase({
      incomes: { recorrentes: [{ nome: "Salário", valorMensal: 1000, mesesPorAno: 13 }] },
      planParams: { aporteMensal: 0, retornoRealAAOverride: 0 },
      lifeEvents: [],
    });
    const p = project(c);
    expect(p.anos[0].entradas).toBeCloseTo(13000, 6);
  });
});

describe("C8 — aposentadoria (3 métodos)", () => {
  const aposCase = (metodo: "depletion" | "preservation" | "perpetuity", valorCarteira = 1500000) =>
    baseCase({
      profile: { idadeAtual: 60, idadeUsufruto: 65 },
      assets: { itens: [{ nome: "Carteira", valor: valorCarteira, classe: "liquidez", retornoRealAA: 0.04 }] },
      incomes: {
        recorrentes: [{ nome: "Salário", valorMensal: 20000 }],
        rendaAposentadoria: { modo: "valor", valor: 8000, flagINSS: true, valorINSSMensal: 3000 },
      },
      assumptions: { anoBase: ANO_BASE, metodoAposentadoria: metodo },
    });

  it("INSS abate a renda-alvo (gap líquido = alvo − INSS)", () => {
    const p = project(aposCase("depletion"));
    expect(p.resumo.rendaAlvoMensalLiquida).toBeCloseTo(5000, 9);
  });

  it("depletion consome principal; preservation preserva", () => {
    // Carteira pequena: o gap (5.000/m) EXCEDE os rendimentos reais — é aqui
    // que os métodos divergem (com rendimentos ≥ gap eles coincidem, correto).
    const dep = project(aposCase("depletion", 500000));
    const pres = project(aposCase("preservation", 500000));
    expect(pres.resumo.patrimonioFinal).toBeGreaterThan(dep.resumo.patrimonioFinal);
    // preservation: nunca saca além dos rendimentos → patrimônio nunca cai abaixo do valor na aposentadoria − tolerância
    const naApos = pres.resumo.patrimonioNaAposentadoria;
    const minPosApos = Math.min(...pres.anos.filter((l) => l.fase === "desacumulacao").map((l) => l.patrimonio));
    expect(minPosApos).toBeGreaterThanOrEqual(naApos * 0.999);
  });

  it("capital necessário: depletion (anuidade até 100) < perpetuidade", () => {
    const dep = project(aposCase("depletion"));
    const perp = project(aposCase("perpetuity"));
    expect(dep.resumo.capitalNecessarioAposentadoria).toBeLessThan(perp.resumo.capitalNecessarioAposentadoria);
    expect(dep.resumo.capitalNecessarioAposentadoria).toBeGreaterThan(0);
  });

  it("esgotamento: carteira pequena seca antes dos 100 e flag aparece", () => {
    const p = project(
      baseCase({
        profile: { idadeAtual: 60, idadeUsufruto: 62 },
        assets: { itens: [{ nome: "Carteira", valor: 200000, classe: "liquidez", retornoRealAA: 0.02 }] },
        incomes: {
          recorrentes: [{ nome: "Salário", valorMensal: 10000 }],
          rendaAposentadoria: { modo: "valor", valor: 6000, flagINSS: false },
        },
        planParams: { aporteMensal: 0 },
      }),
    );
    expect(p.resumo.idadeEsgotamento).not.toBeNull();
    expect(p.resumo.idadeEsgotamento!).toBeLessThan(75);
    expect(p.flags.anosNegativos.length).toBeGreaterThan(0);
    expect(p.resumo.duracaoAposentadoriaAnos).toBe(p.resumo.idadeEsgotamento! - 62);
  });
});

describe("robustez e determinismo", () => {
  it("case parcial (arrays vazios) não lança exceção", () => {
    const c: PlanningCase = {
      profile: { idadeAtual: 30, idadeUsufruto: 65 },
      incomes: { recorrentes: [] },
      expenses: { itens: [] },
      assets: { itens: [] },
      liabilities: { itens: [] },
      goals: [],
      assumptions: { anoBase: ANO_BASE },
    };
    expect(() => project(c)).not.toThrow();
    const p = project(c);
    expect(p.anos.length).toBe(70);
    expect(p.resumo.patrimonioFinal).toBe(0);
  });

  it("determinismo: duas execuções → resultados idênticos", () => {
    const c = baseCase();
    expect(JSON.stringify(project(c))).toBe(JSON.stringify(project(structuredClone(c))));
  });

  it("saída anual cobre idadeAtual → longevidade", () => {
    const p = project(baseCase());
    expect(p.anos[0].ano).toBe(ANO_BASE);
    expect(p.anos[0].idade).toBe(35);
    expect(p.anos[p.anos.length - 1].idade).toBe(99);
  });

  it("déficit recorrente em acumulação é flagado (anosNegativos)", () => {
    const p = project(
      baseCase({
        incomes: { recorrentes: [{ nome: "Salário", valorMensal: 3000 }] },
        expenses: { itens: [{ nome: "Custo", valorMensal: 5000, classe: "essencial" }] },
        planParams: { aporteMensal: 0 },
      }),
    );
    expect(p.flags.anosNegativos.length).toBeGreaterThan(0);
    expect(p.anos[0].saldoCaixa).toBeLessThan(0);
  });
});
