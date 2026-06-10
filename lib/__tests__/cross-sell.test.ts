/**
 * v7 — testes nomeados por regra: eventos da timeline e plano → cross-sell
 * (B1.1–B1.7, B2, dedupe, limiar, janela, teto) + regressão dos sinais
 * existentes (dívida cara, proteção, lista vazia honesta).
 */
import { describe, expect, it } from "vitest";

import { generateOpportunities } from "@/lib/cross-sell";
import { CROSS_SELL_CONFIG as CFG } from "@/lib/cross-sell-config";
import { pesoProximidade } from "@/lib/cross-sell-events";
import { blankPlan } from "@/lib/plan";
import type { LifeEvent, Plan } from "@/lib/types";

const THIS_YEAR = new Date().getFullYear();

/** Plano-base: renda 10k/m (renda anual 120k → limiar 20% = 24k), sobra 4k. */
function basePlan(overrides: Partial<Plan> = {}): Plan {
  const p = blankPlan("qa-v7");
  p.clientProfile = { ...p.clientProfile, firstName: "QA", dateOfBirth: "1985-01-01", segment: "prime" };
  p.cashFlow = {
    incomes: [{ id: "i1", label: "Salário", monthly: 10000, kind: "salary" }],
    expenses: [{ id: "e1", label: "Custo", monthly: 6000, category: "living" }],
  };
  p.netWorth = {
    assets: [{ id: "a1", label: "CDB", value: 200000, assetClass: "investments", liquid: true }],
    liabilities: [],
  };
  return { ...p, ...overrides };
}

const ev = (partial: Partial<LifeEvent> & Pick<LifeEvent, "presetKey" | "kind" | "year" | "amount">): LifeEvent => ({
  id: `ev-${partial.presetKey}-${partial.year}`,
  ...partial,
});

const products = (plan: Plan) => generateOpportunities(plan).map((o) => o.productKey);
const find = (plan: Plan, product: string) =>
  generateOpportunities(plan).find((o) => o.productKey === product);

describe("B1.1 — entrada futura grande → alocação da entrada", () => {
  it("venda de imóvel R$ 450k em +5 anos → inflowParking com valor do motor e origem do evento (aceite 1)", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "property_sell", kind: "inflow", year: THIS_YEAR + 5, amount: 450000 })] });
    const op = find(plan, "crosssell.product.inflowParking");
    expect(op).toBeDefined();
    expect(op!.estimatedValue).toBe(450000);
    expect(op!.origens?.[0]).toMatchObject({ tipo: "event", presetKey: "property_sell", ano: THIS_YEAR + 5 });
  });

  it("herança + objetivo de sucessão com gap → sinal ADICIONAL de sucessão", () => {
    const plan = basePlan({
      netWorth: {
        assets: [{ id: "a1", label: "Carteira", value: 2_000_000, assetClass: "investments", liquid: true }],
        liabilities: [],
      },
      lifeEvents: [ev({ presetKey: "inheritance", kind: "inflow", year: THIS_YEAR + 3, amount: 300000 })],
    });
    const keys = products(plan);
    expect(keys).toContain("crosssell.product.inflowParking");
    expect(keys).toContain("crosssell.product.successionPlanning");
  });
});

describe("B1.2 — saída planejável → poupança programada OU financiamento (aceite 3)", () => {
  it("saída longe + aporte cabe na sobra → plannedSavings com aporte do motor", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "car", kind: "outflow", year: THIS_YEAR + 8, amount: 140000 })] });
    const op = find(plan, "crosssell.product.plannedSavings");
    expect(op).toBeDefined();
    expect(Number(op!.rationaleParams?.aporte)).toBeGreaterThan(0);
  });

  it("saída PRÓXIMA cujo aporte NÃO cabe na sobra → plannedFinancing (nunca silêncio)", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "renovation", kind: "outflow", year: THIS_YEAR + 1, amount: 400000 })] });
    const keys = products(plan);
    expect(keys).toContain("crosssell.product.plannedFinancing");
    expect(keys).not.toContain("crosssell.product.plannedSavings");
  });
});

describe("B1.3 + dedupe — educação evento↔objetivo = UMA oportunidade (aceite 2)", () => {
  it("evento education + objetivo education consolidam num único card com 2 origens", () => {
    const plan = basePlan({
      goals: [{ id: "g-edu", type: "education", label: "Faculdade", targetAmount: 300000, targetYear: THIS_YEAR + 9, priority: "high", currentAmount: 0 }],
      lifeEvents: [ev({ presetKey: "education", kind: "outflow", year: THIS_YEAR + 9, amount: 300000 })],
    });
    const ops = generateOpportunities(plan).filter((o) => o.productKey === "crosssell.product.education");
    expect(ops).toHaveLength(1);
    expect(ops[0].origens!.length).toBeGreaterThanOrEqual(2);
    const tipos = ops[0].origens!.map((o) => o.tipo);
    expect(tipos).toContain("event");
    expect(tipos).toContain("plan");
  });
});

describe("B1.4 — abrir negócio → funding + proteção", () => {
  it("business gera poupança programada E revisão de proteção", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "business", kind: "outflow", year: THIS_YEAR + 6, amount: 200000 })] });
    const keys = products(plan);
    expect(keys).toContain("crosssell.product.plannedSavings");
    expect(keys).toContain("crosssell.product.protectionReview");
  });
});

describe("B1.5 + limiar — viagem internacional e anti-spam (aceite 5)", () => {
  it("viagem ACIMA do limiar (20% da renda anual) → fxAccount", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "travel", kind: "outflow", year: THIS_YEAR + 2, amount: 30000 })] });
    expect(products(plan)).toContain("crosssell.product.fxAccount");
  });

  it("evento ABAIXO do limiar → NENHUMA oportunidade derivada dele", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "travel", kind: "outflow", year: THIS_YEAR + 2, amount: 10000 })] });
    const keys = products(plan);
    expect(keys).not.toContain("crosssell.product.fxAccount");
    expect(keys).not.toContain("crosssell.product.plannedSavings");
  });
});

describe("B1.6 — evento pós-aposentadoria → desacumulação citando anoEsgotamento (aceite 4)", () => {
  it("saída no usufruto com carteira que esgota → decumulationDepletes com {anoEsgotamento}", () => {
    const plan = basePlan({
      cashFlow: {
        incomes: [{ id: "i1", label: "Salário", monthly: 10000, kind: "salary" }],
        expenses: [{ id: "e1", label: "Custo", monthly: 9800, category: "living" }], // sobra 200 → esgota
      },
      netWorth: { assets: [{ id: "a1", label: "Carteira", value: 50000, assetClass: "investments", liquid: true }], liabilities: [] },
      lifeEvents: [ev({ presetKey: "travel", kind: "outflow", year: THIS_YEAR + 30, amount: 60000 })],
    });
    const op = find(plan, "crosssell.product.decumulationReview");
    expect(op).toBeDefined();
    expect(op!.rationaleParams?.anoEsgotamento).toBeDefined();
    expect(Number(op!.rationaleParams!.anoEsgotamento)).toBeGreaterThan(THIS_YEAR);
  });
});

describe("B1.7 — eventos custom nunca são ignorados silenciosamente", () => {
  it("custom inflow grande → família entrada (inflowParking)", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "custom", kind: "inflow", year: THIS_YEAR + 4, amount: 100000 })] });
    expect(products(plan)).toContain("crosssell.product.inflowParking");
  });
  it("custom outflow grande pré-aposentadoria → família saída planejável", () => {
    const plan = basePlan({ lifeEvents: [ev({ presetKey: "custom", kind: "outflow", year: THIS_YEAR + 6, amount: 120000 })] });
    const keys = products(plan);
    expect(keys.some((k) => k === "crosssell.product.plannedSavings" || k === "crosssell.product.plannedFinancing")).toBe(true);
  });
});

describe("B2 — elementos do plano", () => {
  it("B2.1: objetivo descoberto sem funding → aporte programado via motor", () => {
    const plan = basePlan({
      goals: [{ id: "g-x", type: "travel", label: "Volta ao mundo", targetAmount: 200000, targetYear: THIS_YEAR + 6, priority: "medium", currentAmount: 0 }],
    });
    const op = find(plan, "crosssell.product.goalFunding");
    expect(op).toBeDefined();
    expect(Number(op!.rationaleParams?.aporte)).toBeGreaterThan(0);
    expect(op!.origens?.[0].tipo).toBe("plan");
  });

  it("B2.3: conservador com carteira de risco → realocação", () => {
    const plan = basePlan();
    plan.suitability = { answers: {}, flags: [], profile: "conservative", score: 20 };
    const op = find(plan, "crosssell.product.reallocation");
    expect(op).toBeDefined();
    expect(op!.rationaleKey).toBe("crosssell.why.tooRisky");
  });

  it("B2.4: titularidade concentrada + objetivo sucessão → planejamento sucessório", () => {
    const plan = basePlan({
      goals: [{ id: "g-leg", type: "legacy", targetAmount: 400000, targetYear: THIS_YEAR + 20, priority: "medium", currentAmount: 0 }],
    });
    plan.netWorth.assets = [
      { id: "a1", label: "Carteira", value: 900000, assetClass: "investments", liquid: true, ownership: "individual" },
      { id: "a2", label: "Conjunto", value: 100000, assetClass: "cash", liquid: true, ownership: "joint" },
    ];
    expect(products(plan)).toContain("crosssell.product.successionPlanning");
  });
});

describe("B3 — janela temporal e ranqueamento", () => {
  it("peso de proximidade decai linear e nunca zera", () => {
    expect(pesoProximidade(0)).toBe(1);
    expect(pesoProximidade(CFG.janelaAnos)).toBe(CFG.pesoMinimoJanela);
    expect(pesoProximidade(CFG.janelaAnos * 3)).toBe(CFG.pesoMinimoJanela);
    expect(pesoProximidade(2)).toBeGreaterThan(pesoProximidade(4));
  });

  it("mesmo evento mais PRÓXIMO pontua mais alto", () => {
    // +2 anos: aporte ≈ R$ 2,4 mil/mês cabe na sobra (4 mil) → ambos plannedSavings
    const perto = find(basePlan({ lifeEvents: [ev({ presetKey: "car", kind: "outflow", year: THIS_YEAR + 2, amount: 60000 })] }), "crosssell.product.plannedSavings");
    const longe = find(basePlan({ lifeEvents: [ev({ presetKey: "car", kind: "outflow", year: THIS_YEAR + 12, amount: 60000 })] }), "crosssell.product.plannedSavings");
    expect(perto!.score).toBeGreaterThan(longe!.score);
  });

  it("ranking ordenado por score; lista completa (teto é da exibição)", () => {
    const plan = basePlan({
      lifeEvents: [
        ev({ presetKey: "property_sell", kind: "inflow", year: THIS_YEAR + 2, amount: 450000 }),
        ev({ presetKey: "business", kind: "outflow", year: THIS_YEAR + 3, amount: 200000 }),
        ev({ presetKey: "travel", kind: "outflow", year: THIS_YEAR + 2, amount: 40000 }),
      ],
      goals: [{ id: "g-x", type: "travel", targetAmount: 200000, targetYear: THIS_YEAR + 6, priority: "medium", currentAmount: 0 }],
    });
    const ops = generateOpportunities(plan);
    expect(ops.length).toBeGreaterThan(CFG.tetoExibicao); // sem slice no gerador
    for (let i = 1; i < ops.length; i++) expect(ops[i].score).toBeLessThanOrEqual(ops[i - 1].score);
  });
});

describe("Regressão — sinais existentes preservados", () => {
  it("dívida cara continua gerando reestruturação (com origem do plano)", () => {
    const plan = basePlan();
    plan.netWorth.liabilities = [{ id: "l1", label: "Rotativo", balance: 30000, kind: "auto", annualRate: 120 }];
    const op = find(plan, "crosssell.product.debtRestructure");
    expect(op).toBeDefined();
    expect(op!.origens?.[0]).toMatchObject({ tipo: "plan", originKey: "crosssell.origin.debt" });
  });

  it("lista vazia honesta: caso sem sinais → sem oportunidades (aceite 6)", () => {
    const plan = blankPlan("qa-empty");
    plan.clientProfile.dateOfBirth = "1985-01-01";
    expect(generateOpportunities(plan)).toHaveLength(0);
  });
});
