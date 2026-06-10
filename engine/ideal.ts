/**
 * Vision Engine — idealPlan (determinístico).
 *
 * Allocates the monthly surplus across goals by priority:
 * Reserva → Aposentadoria → Sucessão → demais. A VALIDATED BiaProposal
 * (Regra Zero) may reorder goals, propose target YEARS, the reserve
 * multiplier, the retirement method and boolean flags — never amounts.
 * The sum of allocations NEVER exceeds the surplus.
 */
import { planReturnAA, resolveAssumptions } from "./assumptions";
import { annualToMonthly } from "./mathcore";
import { capitalNecessarioAposentadoria, sobraMensal } from "./rules";
import { pmtParaAlvo, resolveAlvo, resolveAnoAlvo } from "./solve";
import type { Assumptions, BiaProposal, Goal, PlanningCase, PlanParameters, TipoObjetivo } from "./types";

const TIPOS_OBRIGATORIOS: TipoObjetivo[] = ["reserva", "aposentadoria", "sucessao"];

/** The 3 mandatory goals are guaranteed — missing ones are merged in. */
export function ensureMandatoryGoals(goals: Goal[]): Goal[] {
  const out = [...goals];
  for (const tipo of TIPOS_OBRIGATORIOS) {
    if (!out.some((g) => g.tipo === tipo)) out.push({ id: `auto-${tipo}`, tipo });
  }
  return out;
}

function defaultOrder(goals: Goal[]): Goal[] {
  const rank = (g: Goal) => {
    const i = TIPOS_OBRIGATORIOS.indexOf(g.tipo);
    if (i >= 0) return i;
    const prio = g.prioridade === "alta" ? 0 : g.prioridade === "media" ? 1 : 2;
    return 10 + prio;
  };
  return [...goals].sort((x, y) => rank(x) - rank(y) || x.id.localeCompare(y.id));
}

function applyProposalOrder(goals: Goal[], ordem?: string[]): Goal[] {
  if (!ordem?.length) return defaultOrder(goals);
  const byId = new Map(goals.map((g) => [g.id, g]));
  const picked: Goal[] = [];
  for (const id of ordem) {
    const g = byId.get(id);
    if (g && !picked.includes(g)) picked.push(g);
  }
  for (const g of defaultOrder(goals)) if (!picked.includes(g)) picked.push(g);
  return picked;
}

/** Own-property, integer-only lookup — immune to prototype-inherited keys
 *  (e.g. a goal literally named "constructor"). */
function dataProposta(datas: Record<string, number> | undefined, id: string): number | undefined {
  if (!datas || !Object.prototype.hasOwnProperty.call(datas, id)) return undefined;
  const v = datas[id];
  return Number.isInteger(v) ? v : undefined;
}

export function idealPlan(c: PlanningCase, proposta?: BiaProposal): PlanParameters {
  const a0 = resolveAssumptions(c);
  const a: Assumptions = {
    ...a0,
    metodoAposentadoria: proposta?.metodoAposentadoria ?? a0.metodoAposentadoria,
  };
  const multiplicador = proposta?.multiplicadorReserva ?? a.multiplicadorReservaDefault;
  const retornoAA = planReturnAA(c, a);
  const iM = annualToMonthly(retornoAA);

  const goals = applyProposalOrder(ensureMandatoryGoals(c.goals), proposta?.ordemPrioridade);

  // Retirement age: the case's, optionally moved by a proposed target year for
  // the retirement goal (clamped to a sane window).
  let idadeAposentadoria = c.profile.idadeUsufruto;
  const aposGoal = goals.find((g) => g.tipo === "aposentadoria");
  const anoProposto = aposGoal ? dataProposta(proposta?.datasAlvo, aposGoal.id) : undefined;
  if (anoProposto !== undefined) {
    const idadeProposta = c.profile.idadeAtual + (anoProposto - a.anoBase);
    idadeAposentadoria = Math.min(
      a.longevidadeAnos - 1,
      Math.max(c.profile.idadeAtual + 1, idadeProposta),
    );
  }
  // The funding horizon of the retirement goal uses the CLAMPED age — never
  // the raw proposed year.
  const anoAposClamped = a.anoBase + (idadeAposentadoria - c.profile.idadeAtual);

  const caseEfetivo: PlanningCase = {
    ...c,
    profile: { ...c.profile, idadeUsufruto: idadeAposentadoria },
  };
  // Honored flag: considerarINSS toggles the INSS deduction on the income target.
  const considerarINSS = proposta?.flags?.considerarINSS;
  if (considerarINSS !== undefined && caseEfetivo.incomes.rendaAposentadoria) {
    caseEfetivo.incomes = {
      ...caseEfetivo.incomes,
      rendaAposentadoria: {
        ...caseEfetivo.incomes.rendaAposentadoria,
        flagINSS: considerarINSS,
      },
    };
  }

  const sobra = Math.max(0, sobraMensal(c));
  let restante = sobra;
  const alocacoes: PlanParameters["alocacoes"] = [];

  for (const g of goals) {
    const anoAlvo =
      g.tipo === "aposentadoria"
        ? anoAposClamped
        : (dataProposta(proposta?.datasAlvo, g.id) ?? resolveAnoAlvo(caseEfetivo, a, g));
    const nMeses = Math.max(0, (anoAlvo - a.anoBase) * 12);
    const alvo =
      g.tipo === "aposentadoria"
        ? capitalNecessarioAposentadoria(caseEfetivo, a, retornoAA)
        : resolveAlvo(caseEfetivo, a, g, multiplicador);
    const pv = Math.max(0, g.valorAtual ?? 0);
    const necessario = Number.isFinite(alvo) ? pmtParaAlvo(alvo, pv, iM, nMeses, a.timingAportes) : restante;
    const aporte = Math.min(necessario, restante);
    alocacoes.push({ goalId: g.id, tipo: g.tipo, aporteMensal: aporte });
    restante = Math.max(0, restante - aporte);
  }

  const total = alocacoes.reduce((s, x) => s + x.aporteMensal, 0);

  return {
    aporteMensalTotal: total,
    alocacoes,
    idadeAposentadoria,
    retornoRealAA: retornoAA,
    inflacaoAA: a.inflacaoAA,
    metodoAposentadoria: a.metodoAposentadoria,
    multiplicadorReserva: multiplicador,
    sobraMensal: sobra,
    racionalSlots: {
      aporteTotal: total,
      sobra,
      saldoLivre: sobra - total,
      idadeAposentadoria,
      retornoRealAA: retornoAA,
      metodo: a.metodoAposentadoria,
      multiplicadorReserva: multiplicador,
      capitalAposentadoria: capitalNecessarioAposentadoria(caseEfetivo, a, retornoAA),
    },
  };
}
