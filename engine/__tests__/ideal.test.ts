/** idealPlan — determinístico, clamped, 3 obrigatórios; property-based (50 cases). */
import { describe, expect, it } from "vitest";

import { idealPlan } from "../ideal";
import { sobraMensal } from "../rules";
import { ANO_BASE, baseCase, mulberry32, randomCase } from "./helpers";

describe("idealPlan — propriedades estruturais", () => {
  it("prioridade default: reserva → aposentadoria → sucessão → demais", () => {
    const p = idealPlan(baseCase());
    expect(p.alocacoes[0].tipo).toBe("reserva");
    expect(p.alocacoes[1].tipo).toBe("aposentadoria");
    expect(p.alocacoes[2].tipo).toBe("sucessao");
  });

  it("Σ aportes ≤ sobra e saldo livre ≥ 0", () => {
    const p = idealPlan(baseCase());
    expect(p.aporteMensalTotal).toBeLessThanOrEqual(p.sobraMensal + 1e-9);
    expect(Number(p.racionalSlots.saldoLivre)).toBeGreaterThanOrEqual(-1e-9);
  });

  it("sobra negativa → todas as alocações 0 (nunca aloca dívida)", () => {
    const c = baseCase({
      incomes: { recorrentes: [{ nome: "Salário", valorMensal: 3000 }] },
      expenses: { itens: [{ nome: "Custo", valorMensal: 6000, classe: "essencial" }] },
    });
    const p = idealPlan(c);
    expect(p.aporteMensalTotal).toBe(0);
    expect(p.alocacoes.every((x) => x.aporteMensal === 0)).toBe(true);
  });

  it("proposta da BIA reordena e move datas — mas só estrutura", () => {
    const c = baseCase();
    const p = idealPlan(c, {
      ordemPrioridade: ["g-apos", "g-reserva", "g-sucessao"],
      datasAlvo: { "g-apos": ANO_BASE + 20 },
      multiplicadorReserva: 12,
      metodoAposentadoria: "preservation",
    });
    expect(p.alocacoes[0].goalId).toBe("g-apos");
    expect(p.idadeAposentadoria).toBe(35 + 20);
    expect(p.multiplicadorReserva).toBe(12);
    expect(p.metodoAposentadoria).toBe("preservation");
    expect(p.aporteMensalTotal).toBeLessThanOrEqual(p.sobraMensal + 1e-9);
  });

  it("determinismo: mesma entrada → mesma saída", () => {
    const c = baseCase();
    expect(JSON.stringify(idealPlan(c))).toBe(JSON.stringify(idealPlan(structuredClone(c))));
  });
});

describe("idealPlan — property-based (50 cases aleatórios, seed fixa)", () => {
  const rnd = mulberry32(20260610);

  for (let k = 0; k < 50; k++) {
    const c = randomCase(rnd);
    it(`case #${k + 1}: clamp à sobra + 3 obrigatórios + sucessão ≥ 0`, () => {
      const p = idealPlan(c);
      const sobra = Math.max(0, sobraMensal(c));

      // Σ aportes ≤ sobra (invariante central da Regra de alocação)
      expect(p.aporteMensalTotal).toBeLessThanOrEqual(sobra + 1e-6);
      const soma = p.alocacoes.reduce((s, x) => s + x.aporteMensal, 0);
      expect(Math.abs(soma - p.aporteMensalTotal)).toBeLessThan(1e-9);

      // 3 obrigatórios sempre presentes
      for (const tipo of ["reserva", "aposentadoria", "sucessao"]) {
        expect(p.alocacoes.some((x) => x.tipo === tipo)).toBe(true);
      }

      // nenhum aporte negativo; idade de aposentadoria sã
      expect(p.alocacoes.every((x) => x.aporteMensal >= 0)).toBe(true);
      expect(p.idadeAposentadoria).toBeGreaterThan(c.profile.idadeAtual);
    });
  }
});
