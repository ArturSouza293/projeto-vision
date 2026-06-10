/**
 * v7 — sinais de cross-sell derivados dos EVENTOS da timeline (B1) e dos
 * elementos do plano que faltavam (B2). Determinístico e explicável:
 * famílias de regra por categoria (nunca SKU hardcoded), valores 100% do
 * motor (valor do evento, aporte via TVM do motor — mesma rota do solveGoal),
 * score = base do fit + fatores visíveis (proximidade na janela + valor
 * relativo à renda anual), parâmetros em `lib/cross-sell-config.ts`.
 *
 * REGRA ZERO: nenhuma IA; racionais são templates i18n com slots numéricos.
 */
import { CROSS_SELL_CONFIG as CFG } from "@/lib/cross-sell-config";
import { monthlyPmtForTarget } from "@/lib/engine/adapter";
import { summarizePlan, variantAssumptions } from "@/lib/engine/plan-compare";
import {
  cashFlowTotals,
  goalFundedPct,
  investableWealth,
  netWorthTotals,
  successionTarget,
} from "@/lib/calc";
import { getPremises } from "@/lib/premises";
import type {
  CrossSellOpportunity,
  Fit,
  LifeEvent,
  Plan,
  SignalOrigin,
} from "@/lib/types";

const FIT_BASE: Record<Fit, number> = { high: 70, medium: 50, low: 32 };

/* ------------------------------------------------------------- fatores */

/** Peso de proximidade: 1 no curto prazo, decai linear até a janela, nunca 0. */
export function pesoProximidade(anosAte: number): number {
  if (anosAte <= 0) return 1;
  if (anosAte >= CFG.janelaAnos) return CFG.pesoMinimoJanela;
  return 1 - (anosAte / CFG.janelaAnos) * (1 - CFG.pesoMinimoJanela);
}

/**
 * Score explicável de oportunidade de EVENTO: base do fit + proximidade
 * (≤ pesos.proximidade) + valor RELATIVO à renda anual (≤ pesos.valorRelativo).
 * O boost logarítmico de valor ABSOLUTO das regras de plano não entra aqui —
 * duplicaria o sinal de valor e saturaria o teto de 99, achatando o ranking.
 */
function scoreEvento(fit: Fit, valor: number, rendaAnual: number, anosAte: number): number {
  const fProx = Math.round(CFG.pesos.proximidade * pesoProximidade(anosAte));
  const fValor = Math.round(CFG.pesos.valorRelativo * Math.min(1, valor / Math.max(1, rendaAnual)));
  return Math.min(99, FIT_BASE[fit] + fProx + fValor);
}

const originOfEvent = (ev: LifeEvent): SignalOrigin => ({
  tipo: "event",
  label: ev.label,
  presetKey: ev.presetKey,
  ano: ev.year,
});

/* --------------------------------------------------- famílias de regra */

const ENTRADA_GRANDE = new Set(["property_sell", "inheritance", "bonus"]);
const SAIDA_PLANEJAVEL = new Set(["property_buy", "car", "renovation", "wedding"]);

export function signalsFromEvents(plan: Plan): CrossSellOpportunity[] {
  const events = plan.lifeEvents ?? [];
  if (events.length === 0) return [];

  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const premises = getPremises(plan);
  const a = variantAssumptions(plan);
  const rendaAnual = Math.max(1, cf.income * 12);
  const sobra = cf.surplus;
  const retorno = a.expectedRealReturn / 100;
  const thisYear = new Date().getFullYear();
  // KPIs do motor (uma projeção só): ano de aposentadoria + ano de esgotamento.
  const kpis = summarizePlan(plan);
  const retirementYear = kpis.anoAposentadoria;
  const limiar = CFG.limiarPctRendaAnual * rendaAnual;
  const sucessaoGap = successionTarget(plan.netWorth, premises, plan.clientProfile.lifeInsurance ?? 0);
  const educationGoal = plan.goals.find((g) => g.type === "education");

  const out: CrossSellOpportunity[] = [];
  let i = 0;
  const add = (
    fit: Fit,
    productKey: string,
    categoryKey: string,
    rationaleKey: string,
    estimatedValue: number,
    ev: LifeEvent,
    rationaleParams: Record<string, string | number>,
  ) =>
    out.push({
      id: `ev-${i++}`,
      productKey,
      categoryKey,
      rationaleKey,
      rationaleParams,
      fit,
      estimatedValue,
      score: scoreEvento(fit, estimatedValue, rendaAnual, ev.year - thisYear),
      origens: [originOfEvent(ev)],
    });

  for (const ev of events) {
    // B3 — limiar de pertinência (anti-spam): evento pequeno não vira oferta.
    if (ev.amount < limiar) continue;
    const anosAte = Math.max(0, ev.year - thisYear);
    const posAposentadoria = ev.year >= retirementYear;

    if (ev.kind === "inflow") {
      // B1.1 — entrada futura grande → plano de alocação da entrada.
      if (ENTRADA_GRANDE.has(ev.presetKey) || ev.presetKey === "custom") {
        add("high", "crosssell.product.inflowParking", "crosssell.cat.investments",
          "crosssell.why.inflowParking", ev.amount, ev, { ano: ev.year });
        // entrada + objetivo de Sucessão com gap → sinal adicional (B1.1).
        if (ev.presetKey === "inheritance" && sucessaoGap > 0) {
          add("medium", "crosssell.product.successionPlanning", "crosssell.cat.wealth",
            "crosssell.why.inflowSuccession", sucessaoGap, ev, { ano: ev.year });
        }
      }
      continue;
    }

    // saídas -----------------------------------------------------------
    if (posAposentadoria) {
      // B1.6 — evento no usufruto: revisão de desacumulação; cita anoEsgotamento.
      add("high", "crosssell.product.decumulationReview", "crosssell.cat.retirement",
        kpis.anoEsgotamento !== null ? "crosssell.why.decumulationDepletes" : "crosssell.why.decumulation",
        ev.amount, ev,
        kpis.anoEsgotamento !== null ? { ano: ev.year, anoEsgotamento: kpis.anoEsgotamento } : { ano: ev.year });
      continue;
    }

    if (ev.presetKey === "education" || (ev.goalId && educationGoal && ev.goalId === educationGoal.id)) {
      // B1.3 — educação: instrumento por ATRIBUTOS (horizonte longo); o
      // dedupe com o objetivo education acontece na consolidação por produto.
      add("high", "crosssell.product.education", "crosssell.cat.goals",
        "crosssell.why.educationHorizon", ev.amount, ev, { ano: ev.year, anos: anosAte });
      continue;
    }

    if (ev.presetKey === "business") {
      // B1.4 — abrir negócio: funding + PROTEÇÃO (renda ficará volátil).
      const aporte = monthlyPmtForTarget(ev.amount, Math.max(1, anosAte), retorno);
      add("high", "crosssell.product.plannedSavings", "crosssell.cat.goals",
        "crosssell.why.plannedSavings", ev.amount, ev, { ano: ev.year, aporte: Math.round(aporte) });
      add("high", "crosssell.product.protectionReview", "crosssell.cat.protection",
        "crosssell.why.businessVolatility", Math.min(rendaAnual * 5, 3_000_000), ev, { ano: ev.year });
      continue;
    }

    if (ev.presetKey === "travel") {
      // B1.5 — moeda estrangeira, somente acima do limiar (já filtrado acima).
      add("medium", "crosssell.product.fxAccount", "crosssell.cat.international",
        "crosssell.why.travelFx", ev.amount, ev, { ano: ev.year });
      continue;
    }

    if (ev.presetKey === "child") {
      add("medium", "crosssell.product.protectionReview", "crosssell.cat.protection",
        "crosssell.why.familyGrowing", Math.min(rendaAnual * 5, 3_000_000), ev, { ano: ev.year });
      continue;
    }

    if (SAIDA_PLANEJAVEL.has(ev.presetKey) || ev.presetKey === "custom") {
      // B1.2 — poupança programada até a data (TVM do motor, rota do solveGoal);
      // perto + não cabe na sobra → financiamento planejado/consórcio (categoria).
      const aporte = monthlyPmtForTarget(ev.amount, Math.max(1, anosAte), retorno);
      const naoCabe = aporte > Math.max(0, sobra);
      if (naoCabe && anosAte <= CFG.janelaFinanciamentoAnos) {
        add("high", "crosssell.product.plannedFinancing", "crosssell.cat.credit",
          "crosssell.why.plannedFinancing", ev.amount, ev, { ano: ev.year, aporte: Math.round(aporte) });
      } else {
        add("high", "crosssell.product.plannedSavings", "crosssell.cat.goals",
          "crosssell.why.plannedSavings", ev.amount, ev, { ano: ev.year, aporte: Math.round(aporte) });
      }
    }
  }

  return out;
}

/* ----------------------------- B2: elementos do plano que faltavam ----- */

export function signalsFromPlanGaps(plan: Plan): CrossSellOpportunity[] {
  const out: CrossSellOpportunity[] = [];
  const cf = cashFlowTotals(plan.cashFlow, plan.netWorth);
  const nw = netWorthTotals(plan.netWorth);
  const investable = Math.max(1, investableWealth(plan.netWorth));
  const a = variantAssumptions(plan);
  const retorno = a.expectedRealReturn / 100;
  const thisYear = new Date().getFullYear();
  const rendaAnual = Math.max(1, cf.income * 12);
  let i = 0;
  const add = (
    fit: Fit,
    productKey: string,
    categoryKey: string,
    rationaleKey: string,
    estimatedValue: number,
    origem: SignalOrigin,
    rationaleParams?: Record<string, string | number>,
  ) =>
    out.push({
      id: `pl-${i++}`,
      productKey,
      categoryKey,
      rationaleKey,
      rationaleParams,
      fit,
      estimatedValue,
      score: Math.min(99, FIT_BASE[fit] + Math.min(26, Math.round(Math.log10(Math.max(1, estimatedValue)) * 4))),
      origens: [origem],
    });

  // B2.1 — objetivo descoberto sem funding → aporte programado (motor).
  for (const g of plan.goals) {
    if (!g.targetAmount || g.targetYear <= thisYear) continue;
    const funded = goalFundedPct(g, retorno, thisYear);
    if (funded >= 90) continue;
    const gap = Math.max(0, g.targetAmount * (1 - funded / 100));
    if (gap < CFG.limiarPctRendaAnual * rendaAnual) continue;
    const aporte = monthlyPmtForTarget(gap, Math.max(1, g.targetYear - thisYear), retorno);
    add("medium", "crosssell.product.goalFunding", "crosssell.cat.goals",
      "crosssell.why.goalGap", gap,
      { tipo: "plan", label: g.label, originKey: `goalType.${g.type}`, ano: g.targetYear },
      { ano: g.targetYear, aporte: Math.round(aporte) });
  }

  // B2.2 — esgotamento antes da longevidade → renda vitalícia/desacumulação.
  const kpis = summarizePlan(plan);
  if (kpis.anoEsgotamento !== null) {
    add("high", "crosssell.product.decumulationReview", "crosssell.cat.retirement",
      "crosssell.why.depletionPlan", kpis.patrimonioNaAposentadoria,
      { tipo: "plan", originKey: "crosssell.origin.depletion", ano: kpis.anoEsgotamento },
      { anoEsgotamento: kpis.anoEsgotamento });
  }

  // B2.3 — suitability × alocação implícita divergente → realocação.
  const profile = plan.suitability.profile;
  if (profile) {
    const risco = (nw.byClass.investments + nw.byClass.foreign) / investable;
    const caixa = nw.byClass.cash / investable;
    if (profile === "conservative" && risco > CFG.realocacao.maxRiscoConservador) {
      add("high", "crosssell.product.reallocation", "crosssell.cat.investments",
        "crosssell.why.tooRisky", Math.round(nw.byClass.investments + nw.byClass.foreign),
        { tipo: "plan", originKey: "crosssell.origin.suitability" });
    } else if (profile === "aggressive" && caixa > CFG.realocacao.maxCaixaAgressivo) {
      add("high", "crosssell.product.reallocation", "crosssell.cat.investments",
        "crosssell.why.tooConservative", Math.round(nw.byClass.cash),
        { tipo: "plan", originKey: "crosssell.origin.suitability" });
    }
  }

  // B2.4 — titularidade concentrada + objetivo sucessão → planejamento sucessório.
  const successionGoal = plan.goals.find((g) => g.type === "legacy");
  if (successionGoal && nw.totalAssets > 0) {
    const individual = plan.netWorth.assets
      .filter((as) => (as.ownership ?? "individual") === "individual")
      .reduce((s, as) => s + as.value, 0);
    if (individual / nw.totalAssets > CFG.concentracaoTitularidade) {
      add("medium", "crosssell.product.successionPlanning", "crosssell.cat.wealth",
        "crosssell.why.ownershipConcentration", successionGoal.targetAmount,
        { tipo: "plan", originKey: "crosssell.origin.ownership" });
    }
  }

  return out;
}
