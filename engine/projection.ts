/**
 * Vision Engine — projeção (loop mensal, saída anual).
 *
 * Conventions implemented here:
 *  - C1: internal loop is MONTHLY (events carry ano+mês); output aggregates per year.
 *  - C2: every annual rate becomes effective monthly geometrically.
 *  - C4: the engine computes in REAL terms; `modoProjecao: "nominal"` applies the
 *    exact Fisher inflation factor at ONE boundary (output transform), making it
 *    structurally impossible to mix real flows with nominal rates.
 *  - C5: `timingAportes` end|begin (HP-12C BEG/END).
 *  - C6: per-item real growth (annual steps).
 *  - C8: decumulation by depletion | preservation | perpetuity; INSS reduces the
 *    income target.
 *
 * Modeling decisions (documented, illustrative — see engine/README.md):
 *  - Ages increment at the turn of the calendar year (birthday ≈ January 1st).
 *  - In decumulation the expense items are REPLACED by the retirement income
 *    target (renda-alvo); the portfolio funds the gap net of INSS/continuing income.
 *  - A recurring cash-flow deficit in accumulation is flagged (anosNegativos)
 *    but is NOT auto-funded from wealth; life-event outflows DO drain wealth.
 *  - `mesesPorAno > 12` pays the extra installments in December (13º).
 */
import { resolveAssumptions, planReturnAA } from "./assumptions";
import { liabilityPaymentAt } from "./amortization";
import { annualToMonthly } from "./mathcore";
import {
  capitalNecessarioAposentadoria,
  rendaAlvoAposentadoriaBruta,
  rendaAlvoMensalLiquida,
  sobraMensal,
} from "./rules";
import type {
  Assumptions,
  ClasseAtivo,
  EventoDeVida,
  EventoUnico,
  Fase,
  LinhaAnual,
  PlanningCase,
  Projection,
} from "./types";

interface Bucket {
  classe: ClasseAtivo | "plano";
  valor: number;
  iM: number;
  /** Can be drawn down to fund deficits/retirement. */
  liquido: boolean;
}

/** Withdrawal order: cash-like first, pension last, never imóvel/seguro. */
const ORDEM_SAQUE: (ClasseAtivo | "plano")[] = ["liquidez", "plano", "outros", "exterior", "previdencia"];

function makeBuckets(c: PlanningCase, a: Assumptions, planoIM: number): Bucket[] {
  const buckets: Bucket[] = c.assets.itens.map((item) => ({
    classe: item.classe,
    valor: Math.max(0, item.valor),
    iM: annualToMonthly(item.retornoRealAA ?? a.retornoRealPorClasse[item.classe]),
    liquido: item.classe !== "imovel" && item.classe !== "seguro",
  }));
  buckets.push({ classe: "plano", valor: 0, iM: planoIM, liquido: true });
  return buckets;
}

/** Drain `amount` from liquid buckets in ORDEM_SAQUE. Returns what was actually drawn. */
function sacar(buckets: Bucket[], amount: number): number {
  let restante = amount;
  for (const classe of ORDEM_SAQUE) {
    if (restante <= 0) break;
    for (const b of buckets) {
      if (b.classe !== classe || !b.liquido || b.valor <= 0) continue;
      const take = Math.min(b.valor, restante);
      b.valor -= take;
      restante -= take;
      if (restante <= 0) break;
    }
  }
  return amount - restante;
}

/** Monthly delta map for one-off/recurring events, keyed by month index. */
function indexEvents(c: PlanningCase, anoBase: number, meses: number): Map<number, number> {
  const map = new Map<number, number>();
  const add = (ano: number, mes: number, valor: number) => {
    const idx = (ano - anoBase) * 12 + (mes - 1);
    if (idx >= 0 && idx < meses) map.set(idx, (map.get(idx) ?? 0) + valor);
  };

  for (const ev of c.incomes.eventosUnicos ?? []) {
    addEventoUnico(ev, anoBase, meses, add);
  }
  for (const ev of c.lifeEvents ?? []) {
    addEventoDeVida(ev, add);
  }
  return map;
}

function addEventoUnico(
  ev: EventoUnico,
  anoBase: number,
  meses: number,
  add: (ano: number, mes: number, valor: number) => void,
) {
  const mes = ev.mes ?? 1;
  if (ev.recorrenciaAnos && ev.recorrenciaAnos > 0) {
    const lastYear = anoBase + Math.ceil(meses / 12);
    for (let ano = ev.ano; ano <= lastYear; ano += ev.recorrenciaAnos) add(ano, mes, ev.valor);
  } else {
    add(ev.ano, mes, ev.valor);
  }
}

function addEventoDeVida(ev: EventoDeVida, add: (ano: number, mes: number, valor: number) => void) {
  const sinal = ev.tipo === "entrada" ? 1 : -1;
  const mes = ev.mes ?? 1;
  const ultimo = ev.recorrente && ev.anoFim ? Math.max(ev.ano, ev.anoFim) : ev.ano;
  for (let ano = ev.ano; ano <= ultimo; ano++) add(ano, mes, sinal * ev.valor);
}

export function project(c: PlanningCase): Projection {
  const a = resolveAssumptions(c);
  const anoBase = a.anoBase;
  const idadeAtual = c.profile.idadeAtual;
  const idadeUsufruto = c.profile.idadeUsufruto;
  const anosPlano = Math.max(1, a.longevidadeAnos - idadeAtual);
  const meses = anosPlano * 12;

  const retornoPlanoAA = planReturnAA(c, a);
  const planoIM = annualToMonthly(retornoPlanoAA);
  const buckets = makeBuckets(c, a, planoIM);
  const eventosPorMes = indexEvents(c, anoBase, meses);

  // Monthly contribution while accumulating: explicit plan param, else the
  // case's own surplus (never negative).
  const aporteMensal = Math.max(0, c.planParams?.aporteMensal ?? sobraMensal(c));

  const alvoBruto = rendaAlvoAposentadoriaBruta(c);

  const patrimonioInicial = buckets.reduce((s, b) => s + b.valor, 0);
  const anos: LinhaAnual[] = [];
  const anosNegativos = new Set<number>();

  let patrimonioNaAposentadoria = patrimonioInicial;
  let idadeEsgotamento: number | null = null;

  let entradasAno = 0;
  let saidasAno = 0;

  for (let m = 0; m < meses; m++) {
    const anoIdx = Math.floor(m / 12);
    const ano = anoBase + anoIdx;
    const mesDoAno = (m % 12) + 1;
    const idade = idadeAtual + anoIdx;
    const fase: Fase = idade < idadeUsufruto ? "acumulacao" : "desacumulacao";

    let entradas = 0;
    let saidas = 0;

    /* -------- incomes -------- */
    // Continuing income of THIS month (respects ateAno, growth, mesesPorAno) —
    // the retirement gap is derived from the REAL flows, not a static snapshot.
    let continuaMes = 0;
    for (const r of c.incomes.recorrentes) {
      if (r.ateAno !== undefined && ano > r.ateAno) continue;
      if (fase === "desacumulacao" && !r.continuaNaAposentadoria) continue;
      const fator = Math.pow(1 + (r.crescimentoRealAA ?? 0), anoIdx);
      const meses = r.mesesPorAno ?? 12;
      // mesesPorAno < 12: paid only in the first `meses` months of the year;
      // > 12 (13º): extras land in December.
      let pago = 0;
      if (mesDoAno <= Math.min(12, meses)) pago += r.valorMensal * fator;
      if (meses > 12 && mesDoAno === 12) pago += (meses - 12) * r.valorMensal * fator;
      entradas += pago;
      if (fase === "desacumulacao") continuaMes += pago;
    }
    if (fase === "desacumulacao") {
      const ra = c.incomes.rendaAposentadoria;
      if (ra?.flagINSS) {
        const inss = ra.valorINSSMensal ?? 0;
        entradas += inss;
        continuaMes += inss;
      }
    }

    /* -------- outflows -------- */
    let dividaMes = 0;
    if (fase === "acumulacao") {
      for (const d of c.expenses.itens) {
        if (d.ateAno !== undefined && ano > d.ateAno) continue;
        saidas += d.valorMensal * Math.pow(1 + (d.crescimentoRealAA ?? 0), anoIdx);
      }
    } else {
      // Expense items are replaced by the retirement income target (C8).
      saidas += alvoBruto;
    }
    for (const l of c.liabilities.itens) {
      dividaMes += liabilityPaymentAt(l, m + 1);
    }
    saidas += dividaMes;

    /* -------- events (cash, hit the portfolio) -------- */
    const delta = eventosPorMes.get(m) ?? 0;
    if (delta > 0) entradas += delta;
    if (delta < 0) saidas += -delta;

    /* -------- grow + invest/withdraw -------- */
    if (a.timingAportes === "begin" && fase === "acumulacao") {
      buckets[buckets.length - 1].valor += aporteMensal;
    }
    for (const b of buckets) b.valor *= 1 + b.iM;
    if (a.timingAportes === "end" && fase === "acumulacao") {
      buckets[buckets.length - 1].valor += aporteMensal;
    }

    if (delta > 0) buckets[buckets.length - 1].valor += delta;
    if (delta < 0) {
      const pago = sacar(buckets, -delta);
      if (pago < -delta - 1e-9) anosNegativos.add(ano);
    }

    if (fase === "desacumulacao") {
      // Gap of THIS month, from the simulated flows (ateAno/growth/13º honored).
      const gapMes = Math.max(0, alvoBruto - continuaMes);
      // Debt service is mandatory — always funded from the portfolio in
      // decumulation. The income gap follows the method: preservation/
      // perpetuity only consume the month's real earnings.
      let permitidoGap = gapMes;
      if (a.metodoAposentadoria !== "depletion") {
        const rendimentos = buckets.reduce((s, b) => (b.liquido ? s + (b.valor - b.valor / (1 + b.iM)) : s), 0);
        permitidoGap = Math.min(gapMes, Math.max(0, rendimentos));
      }
      const necessidade = dividaMes + permitidoGap;
      const sacado = necessidade > 0 ? sacar(buckets, necessidade) : 0;
      entradas += sacado;
      if (sacado < dividaMes + gapMes - 1e-9) {
        anosNegativos.add(ano);
        if (idadeEsgotamento === null) {
          const liquidoRestante = buckets.reduce((s, b) => (b.liquido ? s + b.valor : s), 0);
          if (liquidoRestante <= 1e-9) idadeEsgotamento = idade;
        }
      }
    }

    entradasAno += entradas;
    saidasAno += saidas;
    // Recurring cash-flow deficit flag — life-event outflows are EXCLUDED
    // here (a funded one-off purchase is a plan, not a problem; unfunded
    // events are flagged by the sacar() shortfall path above).
    if (fase === "acumulacao") {
      const cashEntradas = entradas - Math.max(0, delta);
      const cashSaidas = saidas - Math.max(0, -delta);
      if (cashEntradas - cashSaidas < -0.005) anosNegativos.add(ano);
    }

    /* -------- year close -------- */
    if (mesDoAno === 12) {
      const patrimonio = buckets.reduce((s, b) => s + b.valor, 0);
      anos.push({
        ano,
        idade,
        entradas: entradasAno,
        saidas: saidasAno,
        saldoCaixa: entradasAno - saidasAno,
        patrimonio,
        fase,
      });
      if (idade === idadeUsufruto - 1) patrimonioNaAposentadoria = patrimonio;
      entradasAno = 0;
      saidasAno = 0;
    }
  }

  if (idadeUsufruto <= idadeAtual) patrimonioNaAposentadoria = patrimonioInicial;

  const duracao =
    idadeEsgotamento !== null
      ? Math.max(0, idadeEsgotamento - idadeUsufruto)
      : Math.max(0, a.longevidadeAnos - idadeUsufruto);

  const resumo = {
    patrimonioInicial,
    patrimonioNaAposentadoria,
    patrimonioFinal: anos.length ? anos[anos.length - 1].patrimonio : patrimonioInicial,
    anoAposentadoria: anoBase + Math.max(0, idadeUsufruto - idadeAtual),
    duracaoAposentadoriaAnos: duracao,
    idadeEsgotamento,
    capitalNecessarioAposentadoria: capitalNecessarioAposentadoria(c, a, retornoPlanoAA),
    rendaAlvoMensalLiquida: rendaAlvoMensalLiquida(c),
  };

  const projection: Projection = {
    anos,
    flags: { anosNegativos: [...anosNegativos].sort((x, y) => x - y) },
    resumo,
    assumptionsUsadas: a,
  };

  // C4 — single conversion boundary: nominal output = real output inflated by
  // the exact Fisher factor. Mixing is structurally impossible because the
  // whole computation above is real-only.
  if (a.modoProjecao === "nominal") return inflateProjection(projection, a.inflacaoAA, anoBase);
  return projection;
}

/** Exact-Fisher inflation of a REAL projection to nominal currency (C3/C4).
 *  EVERY monetary field of the resumo is inflated with the same retirement
 *  anchor, so funded-vs-needed comparisons give the same verdict in both modes. */
function inflateProjection(p: Projection, inflacaoAA: number, anoBase: number): Projection {
  const fator = (ano: number) => Math.pow(1 + inflacaoAA, ano - anoBase + 1); // end-of-year factor
  const fatorAposentadoria = fator(p.resumo.anoAposentadoria - 1);
  return {
    ...p,
    anos: p.anos.map((l) => ({
      ...l,
      entradas: l.entradas * fator(l.ano),
      saidas: l.saidas * fator(l.ano),
      saldoCaixa: l.saldoCaixa * fator(l.ano),
      patrimonio: l.patrimonio * fator(l.ano),
    })),
    resumo: {
      ...p.resumo,
      patrimonioNaAposentadoria: p.resumo.patrimonioNaAposentadoria * fatorAposentadoria,
      capitalNecessarioAposentadoria: p.resumo.capitalNecessarioAposentadoria * fatorAposentadoria,
      rendaAlvoMensalLiquida: p.resumo.rendaAlvoMensalLiquida * fatorAposentadoria,
      patrimonioFinal: p.anos.length
        ? p.anos[p.anos.length - 1].patrimonio * fator(p.anos[p.anos.length - 1].ano)
        : p.resumo.patrimonioInicial,
    },
  };
}
