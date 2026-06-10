/** Regressões dos achados confirmados pela revisão adversarial (engine v0 → v0.1). */
import { describe, expect, it } from "vitest";

import { resolveAssumptions } from "../assumptions";
import { idealPlan } from "../ideal";
import { annualToMonthly } from "../mathcore";
import { project } from "../projection";
import { capitalNecessarioAposentadoria } from "../rules";
import type { PlanningCase } from "../types";
import { validateBiaProposal } from "../validator";
import { ANO_BASE, baseCase } from "./helpers";

describe("P0 — serviço de dívida na desacumulação é FINANCIADO pelo patrimônio", () => {
  const retiree = (comDivida: boolean): PlanningCase =>
    baseCase({
      profile: { idadeAtual: 64, idadeUsufruto: 65 },
      assets: { itens: [{ nome: "Carteira", valor: 2000000, classe: "liquidez", retornoRealAA: 0.04 }] },
      incomes: {
        recorrentes: [{ nome: "Salário", valorMensal: 20000 }],
        rendaAposentadoria: { modo: "valor", valor: 8000, flagINSS: true, valorINSSMensal: 8000 }, // gap 0
      },
      liabilities: {
        itens: comDivida
          ? [{ nome: "Imob", sistema: "PRICE", taxaEfetivaAA: 0.1, prazoMeses: 120, saldoDevedor: 500000 }]
          : [],
      },
      planParams: { aporteMensal: 0, retornoRealAAOverride: 0.04 },
    });

  it("o patrimônio do endividado diverge do sem-dívida (parcelas saem dos buckets)", () => {
    const sem = project(retiree(false));
    const com = project(retiree(true));
    const ano5sem = sem.anos[5].patrimonio;
    const ano5com = com.anos[5].patrimonio;
    expect(ano5com).toBeLessThan(ano5sem);
    // a diferença é da ordem do serviço de dívida acumulado (> R$ 300 mil em 5 anos)
    expect(ano5sem - ano5com).toBeGreaterThan(300000);
  });

  it("dívida impagável na desacumulação é flagada", () => {
    const pobre = baseCase({
      profile: { idadeAtual: 64, idadeUsufruto: 65 },
      assets: { itens: [{ nome: "Carteira", valor: 10000, classe: "liquidez" }] },
      incomes: {
        recorrentes: [{ nome: "Salário", valorMensal: 5000 }],
        rendaAposentadoria: { modo: "valor", valor: 0, flagINSS: false },
      },
      liabilities: {
        itens: [{ nome: "Imob", sistema: "PRICE", taxaEfetivaAA: 0.1, prazoMeses: 120, saldoDevedor: 500000 }],
      },
      planParams: { aporteMensal: 0 },
    });
    const p = project(pobre);
    expect(p.flags.anosNegativos.length).toBeGreaterThan(0);
  });
});

describe("P0 — mesesPorAno < 12 honrado pela projeção", () => {
  it("renda 1.000 × 6 meses/ano → entradas anuais = 6.000", () => {
    const c = baseCase({
      profile: { idadeAtual: 40, idadeUsufruto: 100 },
      incomes: { recorrentes: [{ nome: "Sazonal", valorMensal: 1000, mesesPorAno: 6 }] },
      expenses: { itens: [] },
      planParams: { aporteMensal: 0, retornoRealAAOverride: 0 },
      lifeEvents: [],
    });
    expect(project(c).anos[0].entradas).toBeCloseTo(6000, 6);
  });
});

describe("P1 — gap de aposentadoria dinâmico (ateAno / crescimento / 13º)", () => {
  it("aluguel contínuo que expira: o patrimônio passa a financiar o gap inteiro depois", () => {
    const mk = (ateAno?: number) =>
      baseCase({
        profile: { idadeAtual: 64, idadeUsufruto: 65 },
        assets: { itens: [{ nome: "Carteira", valor: 1500000, classe: "liquidez", retornoRealAA: 0.04 }] },
        incomes: {
          recorrentes: [
            { nome: "Salário", valorMensal: 15000 },
            { nome: "Aluguel", valorMensal: 5000, continuaNaAposentadoria: true, ateAno },
          ],
          rendaAposentadoria: { modo: "valor", valor: 10000, flagINSS: false },
        },
        planParams: { aporteMensal: 0, retornoRealAAOverride: 0.04 },
      });
    const semExpiracao = project(mk(undefined));
    const comExpiracao = project(mk(ANO_BASE + 5));
    // após a expiração o saque mensal dobra → patrimônio final menor
    expect(comExpiracao.resumo.patrimonioFinal).toBeLessThan(semExpiracao.resumo.patrimonioFinal);
    const anoPos = comExpiracao.anos.find((l) => l.ano === ANO_BASE + 7)!;
    const anoPosSem = semExpiracao.anos.find((l) => l.ano === ANO_BASE + 7)!;
    expect(anoPos.patrimonio).toBeLessThan(anoPosSem.patrimonio);
  });
});

describe("P1 — capital de preservation/perpetuity coerente com a mecânica mensal", () => {
  it("capital = gap mensal / i_m (não gap×12 / i_aa)", () => {
    const c = baseCase({
      profile: { idadeAtual: 60, idadeUsufruto: 65 },
      incomes: {
        recorrentes: [{ nome: "Salário", valorMensal: 20000 }],
        rendaAposentadoria: { modo: "valor", valor: 8000, flagINSS: true, valorINSSMensal: 3000 },
      },
    });
    const a = resolveAssumptions(c);
    const cap = capitalNecessarioAposentadoria(c, a, 0.04, "perpetuity");
    const iM = annualToMonthly(0.04);
    expect(Math.abs(cap - 5000 / iM)).toBeLessThan(1e-6);
    // o capital × rendimento mensal cobre exatamente o gap (consistência interna)
    expect(cap * iM).toBeCloseTo(5000, 6);
  });
});

describe("P2 — modo nominal: veredito financiado/deficitário idêntico ao real (C4)", () => {
  it("razão patrimônio/capital igual nos dois modos", () => {
    const mk = (modo: "real" | "nominal") =>
      baseCase({ assumptions: { anoBase: ANO_BASE, modoProjecao: modo, inflacaoAA: 0.04 } });
    const real = project(mk("real"));
    const nominal = project(mk("nominal"));
    const razaoReal = real.resumo.patrimonioNaAposentadoria / real.resumo.capitalNecessarioAposentadoria;
    const razaoNominal =
      nominal.resumo.patrimonioNaAposentadoria / nominal.resumo.capitalNecessarioAposentadoria;
    expect(Math.abs(razaoReal - razaoNominal)).toBeLessThan(1e-9);
  });
});

describe("P2 — anosNegativos não flagra compra planejada e financiada", () => {
  it("evento de saída coberto pelo patrimônio não gera flag", () => {
    const c = baseCase({
      profile: { idadeAtual: 40, idadeUsufruto: 100 },
      incomes: { recorrentes: [{ nome: "Salário", valorMensal: 10000 }] },
      expenses: { itens: [{ nome: "Custo", valorMensal: 5000, classe: "essencial" }] },
      assets: { itens: [{ nome: "Caixa", valor: 500000, classe: "liquidez", retornoRealAA: 0.03 }] },
      lifeEvents: [{ id: "carro", tipo: "saida", valor: 120000, ano: ANO_BASE + 2 }],
      planParams: { aporteMensal: 3000 },
    });
    expect(project(c).flags.anosNegativos).toEqual([]);
  });

  it("evento NÃO coberto continua flagado", () => {
    const c = baseCase({
      profile: { idadeAtual: 40, idadeUsufruto: 100 },
      assets: { itens: [{ nome: "Caixa", valor: 10000, classe: "liquidez" }] },
      lifeEvents: [{ id: "casa", tipo: "saida", valor: 500000, ano: ANO_BASE + 1 }],
      planParams: { aporteMensal: 0 },
    });
    expect(project(c).flags.anosNegativos).toContain(ANO_BASE + 1);
  });
});

describe("Regra Zero — endurecimento do validador", () => {
  const c = baseCase();

  it("TOCTOU por getter: o valor lido na validação é o que vale", () => {
    let reads = 0;
    const payload = {
      get multiplicadorReserva() {
        reads += 1;
        return reads === 1 ? 6 : 99;
      },
    };
    const r = validateBiaProposal(payload, c);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.proposal.multiplicadorReserva).toBe(6);
  });

  it("datasAlvo no próprio anoBase é rejeitada (n=0 viraria aporte único)", () => {
    expect(validateBiaProposal({ datasAlvo: { "g-apos": ANO_BASE } }, c).ok).toBe(false);
    expect(validateBiaProposal({ datasAlvo: { "g-apos": ANO_BASE + 1 } }, c).ok).toBe(true);
  });

  it("flags decorativas não existem mais — só considerarINSS", () => {
    expect(validateBiaProposal({ flags: { considerarINSS: true } }, c).ok).toBe(true);
    expect(validateBiaProposal({ flags: { aposentadoriaAntecipada: true } }, c).ok).toBe(false);
    expect(validateBiaProposal({ flags: { priorizarLiquidez: true } }, c).ok).toBe(false);
  });

  it("goal id 'constructor' não envenena o lookup (sem NaN)", () => {
    const evil = baseCase({
      goals: [
        { id: "g-reserva", tipo: "reserva" },
        { id: "g-apos", tipo: "aposentadoria" },
        { id: "g-sucessao", tipo: "sucessao" },
        { id: "constructor", tipo: "outro", valorAlvo: 50000, anoAlvo: ANO_BASE + 5 },
      ],
    });
    const p = idealPlan(evil, { ordemPrioridade: ["constructor"] });
    expect(p.alocacoes.every((x) => Number.isFinite(x.aporteMensal))).toBe(true);
    expect(p.aporteMensalTotal).toBeLessThanOrEqual(p.sobraMensal + 1e-9);
  });

  it("considerarINSS é HONRADA: desligar INSS aumenta o capital necessário", () => {
    const comINSS = baseCase({
      incomes: {
        recorrentes: [{ nome: "Salário", valorMensal: 10000 }],
        rendaAposentadoria: { modo: "percentual", valor: 70, flagINSS: true, valorINSSMensal: 4000 },
      },
    });
    const ligado = idealPlan(comINSS, { flags: { considerarINSS: true } });
    const desligado = idealPlan(comINSS, { flags: { considerarINSS: false } });
    expect(Number(desligado.racionalSlots.capitalAposentadoria)).toBeGreaterThan(
      Number(ligado.racionalSlots.capitalAposentadoria),
    );
  });

  it("ano proposto absurdo para aposentadoria: horizonte usa a idade CLAMPADA", () => {
    const p = idealPlan(baseCase(), { datasAlvo: { "g-apos": ANO_BASE + 80 } }); // idade 115 → clamp 99
    expect(p.idadeAposentadoria).toBeLessThanOrEqual(99);
    expect(p.aporteMensalTotal).toBeLessThanOrEqual(p.sobraMensal + 1e-9);
    expect(p.alocacoes.every((x) => Number.isFinite(x.aporteMensal))).toBe(true);
  });
});
