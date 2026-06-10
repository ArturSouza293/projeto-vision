/**
 * Engine adapter — the ONLY bridge between the app's display shapes and the
 * Vision Engine. All interest/projection arithmetic lives in `engine/`; this
 * layer maps shapes and preserves the app's display semantics so the swap is
 * invisible (Fase B):
 *
 *  - Single liquid bucket at the SCENARIO rate (the v2 app projected the
 *    investable wealth at one rate — per-class returns are a future premise).
 *  - Life events land in DECEMBER (the old annual loop applied them at
 *    year-end, post growth).
 *  - Continuing retirement income (INSS + pension + rent) flows through the
 *    engine's INSS channel — it only exists in decumulation, like before.
 *  - Engine horizon = planningHorizonAge + 1 so the annual series still runs
 *    currentAge..horizonAge inclusive (same point count as v2).
 *
 * Legitimate deltas vs the old annual loop (monthly compounding) are
 * documented in PARITY_NOTES.md and pinned in golden/accepted-deltas.json.
 */
import { engine, fvAnnuity, pvAnnuity, solveTVM } from "@/engine";
import type { EventoDeVida, PlanningCase } from "@/engine";
import type { ProjectionInput } from "@/lib/calc"; // type-only: no runtime cycle
import type { ProjectionPoint, ProjectionResult } from "@/lib/types";

/** Swap point: replace `engine` with an HTTP client of the same contract to go remote. */
const localEngine = engine;

/* ----------------------------------------------- engine-backed primitives */

/** (1+r)^n via the engine (no compounding math outside engine/). */
export function compound(principal: number, rate: number, periods: number): number {
  if (periods <= 0 || principal === 0) return principal;
  return solveTVM({ n: periods, i: rate, pv: -principal, pmt: 0 });
}

/** FV of a level series (END), annual or monthly — engine mathcore. */
export const fvSeries = fvAnnuity;

/** PV annuity factor for n periods at rate r — engine mathcore. */
export function annuityFactorE(n: number, r: number): number {
  if (n <= 0) return 0;
  return pvAnnuity(1, r, n);
}

/** Level PMT that reaches `target` in n periods at rate r (END). */
export function pmtForTarget(target: number, n: number, r: number): number {
  if (n <= 0) return target;
  return Math.max(0, -solveTVM({ n, i: r, pv: 0, fv: target }));
}

/** Monthly equivalent of the ANNUAL pmt above (v2 display convention). */
export function monthlyPmtForTarget(target: number, years: number, r: number): number {
  if (years <= 0) return target;
  return pmtForTarget(target, years, r) / 12;
}

/* --------------------------------------------------------- projection map */

export function toEngineCase(input: ProjectionInput): PlanningCase {
  const anoBase = new Date().getFullYear();
  const lifeEvents: EventoDeVida[] = (input.lifeEvents ?? []).map((ev) => ({
    id: ev.id,
    tipo: ev.kind === "inflow" ? "entrada" : "saida",
    valor: ev.amount,
    // v5: explicit month when the user set one; default stays DECEMBER
    // (v2 parity: events hit at year-end, after growth).
    ano: ev.year,
    mes: ev.month ?? 12,
    recorrente: ev.recurring,
    anoFim: ev.endYear,
  }));

  return {
    profile: {
      idadeAtual: input.currentAge,
      idadeUsufruto: input.retirementAge,
    },
    incomes: {
      recorrentes: [{ nome: "renda", valorMensal: input.annualIncomeNow / 12 }],
      rendaAposentadoria: {
        modo: "valor",
        valor: input.annualNeeds / 12,
        // The INSS channel carries ALL continuing retirement income (INSS +
        // pension + rent) — it flows only in decumulation, like the old loop.
        flagINSS: true,
        valorINSSMensal: input.annualOtherIncome / 12,
      },
    },
    expenses: { itens: [] },
    assets: {
      itens: [
        {
          nome: "investable",
          valor: Math.max(0, input.investableNow),
          classe: "liquidez",
          retornoRealAA: input.realReturn,
        },
      ],
    },
    liabilities: { itens: [] }, // v2 projection never amortized debts into the curve
    goals: [],
    lifeEvents,
    planParams: { aporteMensal: input.monthlyContribution, retornoRealAAOverride: input.realReturn },
    assumptions: {
      anoBase,
      // +1 so the annual series covers currentAge..horizon INCLUSIVE (62 points etc.)
      longevidadeAnos: input.lifeExpectancy + 1,
      metodoAposentadoria: "depletion",
      modoProjecao: "real",
      timingAportes: "end",
    },
  };
}

/** The old `project()` contract, computed by the monthly engine. */
export function projectInputViaEngine(input: ProjectionInput): ProjectionResult {
  const { goals, realReturn: r } = input;
  const thisYear = new Date().getFullYear();
  const proj = localEngine.project(toEngineCase(input));

  // Event inflows per year (plain sums — used to keep the income LINE clean,
  // exactly like v2 where events moved wealth but not the income series).
  const eventInflowByYear = new Map<number, number>();
  for (const ev of input.lifeEvents ?? []) {
    if (ev.kind !== "inflow") continue;
    const last = ev.recurring && ev.endYear ? Math.max(ev.year, ev.endYear) : ev.year;
    for (let y = ev.year; y <= last; y++) {
      eventInflowByYear.set(y, (eventInflowByYear.get(y) ?? 0) + ev.amount);
    }
  }

  const annualContribution = input.monthlyContribution * 12;
  let contributionsCum = 0;
  const points: ProjectionPoint[] = proj.anos.map((l) => {
    const retired = l.fase === "desacumulacao";
    if (!retired) contributionsCum += annualContribution;
    const income = retired
      ? Math.max(0, l.entradas - (eventInflowByYear.get(l.ano) ?? 0))
      : input.annualIncomeNow;
    return {
      year: l.ano,
      age: l.idade,
      wealth: Math.max(0, Math.round(l.patrimonio)),
      contributions: Math.round(contributionsCum),
      income: Math.round(income),
      needs: Math.round(input.annualNeeds),
    };
  });

  const wealthAtRetirement =
    input.retirementAge <= input.currentAge
      ? Math.round(input.investableNow)
      : Math.round(proj.resumo.patrimonioNaAposentadoria);

  const depletionAge = proj.resumo.idadeEsgotamento;
  const retirementDurationYears =
    depletionAge !== null
      ? Math.max(0, depletionAge - input.retirementAge)
      : input.lifeExpectancy - input.retirementAge;

  const estateAtDeath = points.length ? points[points.length - 1].wealth : 0;

  // Probability-of-success: same deterministic logistic as v2 — the capital
  // ratio inputs now come from the engine (annuity via mathcore).
  const retirementYears = Math.max(1, input.lifeExpectancy - input.retirementAge);
  const neededCapital =
    Math.max(0, input.annualNeeds - input.annualOtherIncome) * annuityFactorE(retirementYears, r);
  const ratio = neededCapital <= 0 ? 2 : wealthAtRetirement / neededCapital;
  const probabilityOfSuccess = Math.round(
    Math.min(99, Math.max(1, 100 / (1 + Math.exp(-3.5 * (ratio - 1))))),
  );

  // Per-goal funding at target year (annual semantics, engine arithmetic).
  const goalFunding = goals.map((g) => {
    const yrs = Math.max(0, g.targetYear - thisYear);
    const projected = compound(g.currentAmount, r, yrs) + fvSeries((g.monthlyContribution ?? 0) * 12, r, yrs);
    const pct = g.targetAmount > 0 ? Math.min(100, Math.max(0, (projected / g.targetAmount) * 100)) : 100;
    return { goalId: g.id, fundedPct: Math.round(pct) };
  });

  const sustainableMonthly =
    (wealthAtRetirement / annuityFactorE(retirementYears, r) + input.annualOtherIncome) / 12;
  const incomeGap = Math.round(sustainableMonthly - input.annualNeeds / 12);

  return {
    points,
    wealthAtRetirement,
    retirementDurationYears,
    probabilityOfSuccess,
    estateAtDeath,
    goalFunding,
    incomeGap,
  };
}

export { localEngine as engineClient };
