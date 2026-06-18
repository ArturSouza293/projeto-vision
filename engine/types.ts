/**
 * Vision Engine — domain types.
 *
 * Pure data model, zero UI dependency. The engine is the ONLY source of
 * arithmetic in the app (Regra Zero): the LLM may propose structural inputs
 * (see `BiaProposal`), never numbers shown on screen.
 *
 * Conventions (CFP):
 *  - Internal granularity is MONTHLY; outputs aggregate per YEAR (C1).
 *  - All rates are EFFECTIVE annual unless suffixed `Mensal` (C2).
 *  - Default projection mode is REAL (constant currency); `nominal` is opt-in
 *    and conversion happens in exactly one place (C4).
 *  - Rounding happens only at display time — the engine returns full
 *    precision (C10).
 */

export type ModoProjecao = "real" | "nominal";
export type MetodoAposentadoria = "depletion" | "preservation" | "perpetuity";
/** BEG/END of the HP-12C (C5). App default: "end". */
export type Timing = "end" | "begin";

export type ClasseAtivo =
  | "liquidez"
  | "previdencia"
  | "seguro"
  | "imovel"
  | "exterior"
  | "outros";

export type ClasseDespesa = "essencial" | "discricionaria";
export type SistemaAmortizacao = "PRICE" | "SAC";

/** The 3 mandatory goal types + free-form extras. */
export type TipoObjetivo = "reserva" | "aposentadoria" | "sucessao" | "outro";

/* ------------------------------------------------------------------ case */

export interface Profile {
  idadeAtual: number;
  idadeConjuge?: number;
  dependentes?: { idade: number }[];
  /** Retirement age (start of decumulation). */
  idadeUsufruto: number;
}

export interface RendaRecorrente {
  nome?: string;
  valorMensal: number;
  /** Real growth per year for this item (C6). Default 0. */
  crescimentoRealAA?: number;
  /** Last calendar year the income is received (inclusive). */
  ateAno?: number;
  /** Payments per year. 13 = 13º salário (extra payment in December). Default 12. */
  mesesPorAno?: number;
  /** Keeps flowing after retirement (rent, private pension). Default false. */
  continuaNaAposentadoria?: boolean;
}

export interface EventoUnico {
  nome: string;
  valor: number;
  ano: number;
  /** 1–12. Default 1 (C1). */
  mes?: number;
  /** Repeats every N years when set (e.g. PLR every 1 year). */
  recorrenciaAnos?: number;
}

export interface RendaAposentadoria {
  /** "percentual": `valor`% of pre-retirement recurring income; "valor": absolute monthly BRL. */
  modo: "percentual" | "valor";
  valor: number;
  /** Deduct INSS from the target income (C8). */
  flagINSS: boolean;
  /** Monthly INSS benefit; required when flagINSS (the engine never invents it). */
  valorINSSMensal?: number;
}

export interface Incomes {
  recorrentes: RendaRecorrente[];
  eventosUnicos?: EventoUnico[];
  rendaAposentadoria?: RendaAposentadoria;
}

export interface Despesa {
  nome: string;
  valorMensal: number;
  classe: ClasseDespesa;
  crescimentoRealAA?: number;
  /** Stops at retirement (e.g. children's school) when set. */
  ateAno?: number;
}

export interface Expenses {
  itens: Despesa[];
}

export interface Ativo {
  nome: string;
  valor: number;
  classe: ClasseAtivo;
  /** Real annual return for this asset. Default: per-class assumption. */
  retornoRealAA?: number;
}

export interface Assets {
  itens: Ativo[];
}

export interface Passivo {
  nome: string;
  sistema: SistemaAmortizacao;
  /** Effective annual rate (NOT nominal/12 — C2). */
  taxaEfetivaAA: number;
  /** Remaining term in months. */
  prazoMeses: number;
  saldoDevedor: number;
  garantia?: string;
}

export interface Liabilities {
  itens: Passivo[];
}

export interface Goal {
  id: string;
  tipo: TipoObjetivo;
  nome?: string;
  /** Target amount in today's BRL. Mandatory goals may omit it (engine derives). */
  valorAlvo?: number;
  anoAlvo?: number;
  valorAtual?: number;
  aporteMensal?: number;
  prioridade?: "alta" | "media" | "baixa";
}

/** Timeline v2 life event (+ optional month). */
export interface EventoDeVida {
  id: string;
  tipo: "entrada" | "saida";
  valor: number;
  ano: number;
  /** 1–12. Default 1. */
  mes?: number;
  /** Repeats yearly until `anoFim`. WITHOUT `anoFim` the event stays one-off
   *  (paridade com o app v2) — set both to get a recurring event. */
  recorrente?: boolean;
  anoFim?: number;
}

/** Explicit plan parameters (what the app's sliders control). */
export interface PlanParams {
  /** Monthly contribution invested by the plan. Default: cash-flow surplus. */
  aporteMensal?: number;
  /** Overrides the suitability-profile real return. */
  retornoRealAAOverride?: number;
}

export interface PlanningCase {
  id?: string;
  profile: Profile;
  incomes: Incomes;
  expenses: Expenses;
  assets: Assets;
  liabilities: Liabilities;
  /** ALWAYS contains the 3 mandatory goals (reserva, aposentadoria, sucessao). */
  goals: Goal[];
  lifeEvents?: EventoDeVida[];
  planParams?: PlanParams;
  assumptions?: Partial<Assumptions>;
}

/* ----------------------------------------------------------- assumptions */

export type PerfilRetorno = "conservador" | "moderado" | "agressivo";

export interface Assumptions {
  /** Base calendar year of month 0. The adapter always provides it (determinism). */
  anoBase: number;
  inflacaoAA: number;
  /** Real annual returns by suitability profile (C7: geometric). */
  retornosReaisAA: Record<PerfilRetorno, number>;
  perfilRetorno: PerfilRetorno;
  /** Real annual return by asset class when the item doesn't specify one. */
  retornoRealPorClasse: Record<ClasseAtivo, number>;
  /** Plan until this age (conta centenária). */
  longevidadeAnos: number;
  multiplicadorReservaDefault: 6 | 12;
  /** Succession liquidity = pct × gross assets − previdência − seguros. */
  percentualSucessao: number;
  timingAportes: Timing;
  modoProjecao: ModoProjecao;
  metodoAposentadoria: MetodoAposentadoria;
}

/* ---------------------------------------------------------------- output */

export type Fase = "acumulacao" | "desacumulacao";

export interface LinhaAnual {
  ano: number;
  idade: number;
  /** Total inflows of the year: income + inflow events + (in decumulation)
   *  the portfolio withdrawals that fund the income gap and debt service. */
  entradas: number;
  /** Total outflows (expenses + debt service + outflow events). */
  saidas: number;
  /** entradas − saidas (before investment growth). */
  saldoCaixa: number;
  /** End-of-year total wealth (all asset classes). */
  patrimonio: number;
  fase: Fase;
}

export interface ProjectionFlags {
  /** Years where the cash flow + liquid wealth could not cover outflows. */
  anosNegativos: number[];
}

export interface ProjectionResumo {
  patrimonioInicial: number;
  patrimonioNaAposentadoria: number;
  patrimonioFinal: number;
  anoAposentadoria: number;
  /** Years the wealth lasts in decumulation (= until longevidade when it never depletes). */
  duracaoAposentadoriaAnos: number;
  /** Age at which liquid wealth hits zero in decumulation, or null. */
  idadeEsgotamento: number | null;
  /** Capital needed at retirement for the chosen method (C8). */
  capitalNecessarioAposentadoria: number;
  /** Monthly retirement income target net of INSS/continuing income. */
  rendaAlvoMensalLiquida: number;
}

export interface Projection {
  anos: LinhaAnual[];
  flags: ProjectionFlags;
  resumo: ProjectionResumo;
  /** Echo of the assumptions actually used (post-defaults). */
  assumptionsUsadas: Assumptions;
}

export interface GoalSolution {
  goalId: string;
  /** Monthly PMT to hit the target by anoAlvo (full precision). When the
   *  target year is the base year or earlier (nMeses ≤ 0) this degenerates,
   *  documentedly, to the IMMEDIATE lump shortfall (alvo − pv). */
  aporteNecessarioMensal: number;
  /** PMT clamped to the available surplus. */
  aporteClampedMensal: number;
  /** Earliest feasible year given the available surplus (bisection), or null. */
  anoViavel: number | null;
  viavelComSobra: boolean;
  valorAlvo: number;
  valorProjetadoNoAlvo: number;
}

export interface PlanParameters {
  aporteMensalTotal: number;
  alocacoes: { goalId: string; tipo: TipoObjetivo; aporteMensal: number }[];
  idadeAposentadoria: number;
  retornoRealAA: number;
  inflacaoAA: number;
  metodoAposentadoria: MetodoAposentadoria;
  multiplicadorReserva: 6 | 12;
  /** Surplus the allocation was clamped against (Σ alocações ≤ sobra). */
  sobraMensal: number;
  /** Template slots for the rationale (Regra Zero: app interpolates, LLM never writes numbers). */
  racionalSlots: Record<string, number | string>;
}

/* ------------------------------------------------------------------- TVM */

export interface TVMQuery {
  /** Exactly one of these must be undefined — it is solved for. */
  n?: number;
  /** Effective rate per period. */
  i?: number;
  pv?: number;
  pmt?: number;
  fv?: number;
  timing?: Timing;
}

/* ------------------------------------------------------- BIA (Regra Zero) */

/**
 * The ONLY thing the LLM may propose. No monetary values, no percentages,
 * no computed numbers — structure only. Anything else is rejected by the
 * whitelist validator.
 */
export interface BiaProposal {
  /** Goal ids (must exist in the case), highest priority first. */
  ordemPrioridade?: string[];
  /** Candidate target YEARS per goal id (integers, bounded sanity range). */
  datasAlvo?: Record<string, number>;
  multiplicadorReserva?: 6 | 12;
  metodoAposentadoria?: MetodoAposentadoria;
  /** Known boolean flags only. */
  flags?: Partial<Record<BiaFlag, boolean>>;
}

/** Only flags the engine HONORS exist (Regra Zero: nada decorativo).
 *  considerarINSS → liga/desliga o abatimento do INSS na renda-alvo. */
export type BiaFlag = "considerarINSS";

export interface PlanningEngine {
  project(c: PlanningCase): Projection;
  solveGoal(c: PlanningCase, goalId: string): GoalSolution;
  /** Deterministic; optionally guided by a VALIDATED BIA proposal (Regra Zero). */
  idealPlan(c: PlanningCase, proposta?: BiaProposal): PlanParameters;
  solveTVM(q: TVMQuery): number;
}
