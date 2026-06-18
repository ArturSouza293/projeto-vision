import { describe, expect, it } from "vitest";

import { DEFAULT_ASSUMPTIONS } from "../assumptions";
import { annualToMonthly } from "../mathcore";
import {
  capitalNecessarioAposentadoria,
  capitalParaRendaMensal,
  horizonteUsufrutoMeses,
  rendaSustentavelMensal,
} from "../rules";
import type { Assumptions, PlanningCase } from "../types";

const A: Assumptions = { ...DEFAULT_ASSUMPTIONS, anoBase: 2026 };

/** Caso mínimo: usufruto aos 60, renda-alvo de R$ 10.000/mês, sem renda contínua. */
function caso(extra: Partial<PlanningCase["profile"]> = {}): PlanningCase {
  return {
    profile: { idadeAtual: 40, idadeUsufruto: 60, ...extra },
    incomes: {
      recorrentes: [{ valorMensal: 20000 }],
      rendaAposentadoria: { modo: "valor", valor: 10000, flagINSS: false },
    },
    expenses: { itens: [] },
    assets: { itens: [] },
    liabilities: { itens: [] },
    goals: [],
  };
}

const RET = 0.045; // retorno real a.a. (moderado)
const iM = annualToMonthly(RET);

describe("C8 — usufruto: capital↔renda bidirecional", () => {
  it("perpetuidade: capital = renda/iM (fórmula exata) e round-trip identidade", () => {
    const c = caso();
    const capital = capitalParaRendaMensal(10000, c, A, RET, "preservation");
    expect(capital).toBeCloseTo(10000 / iM, 6);
    // capital → renda volta ao alvo
    expect(rendaSustentavelMensal(capital, c, A, RET, "preservation")).toBeCloseTo(10000, 6);
  });

  it("depletion: round-trip renda→capital→renda ≈ identidade", () => {
    const c = caso();
    const capital = capitalParaRendaMensal(10000, c, A, RET, "depletion");
    expect(capital).toBeGreaterThan(0);
    expect(rendaSustentavelMensal(capital, c, A, RET, "depletion")).toBeCloseTo(10000, 6);
  });

  it("horizonte de renda customizável (pós-morte) AUMENTA o capital necessário", () => {
    const padrao = capitalParaRendaMensal(10000, caso(), A, RET, "depletion");
    // Sônia: renda além da longevidade do titular (ex.: 50 anos de horizonte)
    const longo = capitalParaRendaMensal(10000, caso({ horizonteRendaAnos: 50 }), A, RET, "depletion");
    expect(longo).toBeGreaterThan(padrao);
  });

  it("horizonteUsufrutoMeses: custom vs (longevidade − idade), golden-safe", () => {
    expect(horizonteUsufrutoMeses(caso(), A)).toBe((100 - 60) * 12); // 480
    expect(horizonteUsufrutoMeses(caso({ horizonteRendaAnos: 50 }), A)).toBe(50 * 12); // 600
  });

  it("capitalNecessarioAposentadoria = capitalParaRendaMensal(gap) — consistência", () => {
    const c = caso();
    expect(capitalNecessarioAposentadoria(c, A, RET, "depletion")).toBe(
      capitalParaRendaMensal(10000, c, A, RET, "depletion"),
    );
  });

  it("guardas: capital/renda ≤ 0 → 0", () => {
    const c = caso();
    expect(rendaSustentavelMensal(0, c, A, RET)).toBe(0);
    expect(capitalParaRendaMensal(0, c, A, RET)).toBe(0);
  });
});
