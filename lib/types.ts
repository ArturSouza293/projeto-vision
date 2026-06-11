/**
 * Project Vision — domain model.
 *
 * Names intentionally echo Salesforce FSC objects (Person Account, Household,
 * Financial Account, Financial Goal, Assessment, Financial Plan) so the mock
 * service layer in `/lib/api` can later be swapped for real FSC / aixigo ALTO
 * contracts with minimal churn. See `/lib/api/fsc.ts` and
 * `/lib/api/planning-engine.ts`.
 */

import type { Premises } from "@/lib/premises";

export type Locale = "en" | "pt-BR";

/** Bradesco segmentation (higher of income or invested assets). */
export type Segment = "retail" | "prime" | "principal" | "private";

/** Suitability outcome. */
export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type MaritalStatus =
  | "single"
  | "married"
  | "stable_union"
  | "divorced"
  | "widowed";

/** Brazilian marriage property regime. */
export type MarriageRegime =
  | "partial" // comunhão parcial
  | "universal" // comunhão universal
  | "separate" // separação total
  | "final_aquestos"; // participação final nos aquestos

export type DependentRelation =
  | "child"
  | "spouse"
  | "parent"
  | "sibling"
  | "other";

/** A detailed financial dependent (for succession + goals). */
export interface Dependent {
  id: string;
  name: string;
  relation: DependentRelation;
  age: number;
  /** ISO birth date (yyyy-mm-dd). When set, age is derived from it. */
  birthDate?: string;
}

export type EmploymentStatus =
  | "clt"
  | "pj"
  | "self_employed"
  | "civil_servant"
  | "retired"
  | "business_owner";

export type Gender = "female" | "male" | "other" | "undisclosed";

/* ------------------------------------------------------------------ */
/* Step 1 — Client Profile (Person Account)                            */
/* ------------------------------------------------------------------ */

export interface ClientProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** ISO date (yyyy-mm-dd). */
  dateOfBirth: string;
  gender: Gender;
  maritalStatus: MaritalStatus;
  /** Number of financial dependents (children, supported family). */
  dependents: number;
  /** Detailed dependents (relation + age) for succession / goals. */
  dependentsDetail?: Dependent[];
  /** Planned age to start drawing retirement (usufruto): default retirement-goal target + age cap. */
  retirementUsufructAge?: number;

  // Household
  hasPartner: boolean;
  partnerName?: string;
  /** Spouse CPF (display only). */
  partnerCpf?: string;
  /** Marriage property regime. */
  marriageRegime?: MarriageRegime;

  // Employment & income source
  employmentStatus: EmploymentStatus;
  occupation?: string;

  // Contact
  email?: string;
  phone?: string;
  city?: string;
  /** Brazilian state (UF), e.g. "SP". */
  state?: string;

  // Tax residency / KYC-style
  taxResidency: string; // ISO country, default "BR"
  /** Masked CPF for display only (e.g. "***.***.789-**"). */
  cpfMasked?: string;
  /** Politically Exposed Person flag. */
  pep: boolean;

  /** Life-insurance coverage (BRL) — reduces the succession liquidity gap. */
  lifeInsurance?: number;

  segment: Segment;

  /**
   * v8 — KYC "Conheça seu Cliente" dossier (9 categories). Present ONLY on
   * seed personas (the "Visão 360" demo feature gates on its presence). Cases
   * created from scratch never carry it. STATIC mock data — never sent to the
   * BIA (the payload whitelist in lib/plano-ideal.ts is inclusion-based, so
   * this field cannot leak; a test guards it).
   */
  kyc?: ClientKYC;
}

/* ------------------------------------------------------------------ */
/* v8 — KYC "Conheça seu Cliente" dossier (9 categories)              */
/* Static, illustrative data for the seed personas' Visão 360.        */
/* ------------------------------------------------------------------ */

/** "fanático" | "ocasional" | "raro" — kept as string to allow nuance. */
export interface KYCSport {
  modalidade: string;
  time?: string;
  nivel: string;
}
export interface KYCViagens {
  gosta: boolean;
  /** Free text or destinations, as the dossier phrases it. */
  nota?: string;
}
export interface KYCFilho {
  nome: string;
  idade: number;
  nota?: string;
}
export interface KYCParente {
  parentesco: string;
  nome: string;
  banco?: string;
}
export interface KYCEmpresa {
  nome: string;
  porte?: string;
  nota?: string;
}
export interface KYCImovelInvestimento {
  qtd: number;
  receitaMensal?: number;
  nota?: string;
}
export interface KYCDespesaFixa {
  categoria: string;
  valor: number;
}
export interface KYCSeguroExterno {
  tipo: string;
  possui: boolean;
  obs?: string;
}
export type KYCAlertaSeveridade = "alta" | "media" | "baixa";
export interface KYCAlerta {
  texto: string;
  severidade: KYCAlertaSeveridade;
}

export interface ClientKYC {
  /** 1 — Perfil pessoal */
  perfilPessoal: {
    ramo: string;
    cargo: string;
    /** "Contador: sim · Advogado: não" etc., kept as the dossier phrases it. */
    contadorAdvogado?: string;
    conhecimentoFinanceiro: string; // básico | intermediário | avançado (ranges allowed)
    interesses: string[];
    esporte?: KYCSport;
    admira: string[];
    hobbies: string[];
    viagens: KYCViagens;
    pets: string[];
  };
  /** 2 — Perfil familiar */
  perfilFamiliar: {
    moraCom: string;
    filhos: KYCFilho[];
    arvoreGenealogica: KYCParente[];
  };
  /** 3 — Relacionamento (card prioritário) */
  relacionamento: {
    /** Orientação de abordagem — o maior valor da 360 para o advisor. */
    temasSensiveis: string[];
    canaisPreferidos: string[];
    frequencia: string;
    estiloComunicacao: string;
    conjugeClienteBradesco?: boolean;
    filhosClientesBradesco?: boolean;
    /** Resumo IA mock (badge "exemplo ilustrativo · em produção: BIA"). */
    resumoIAFicha: string;
  };
  /** 4 — Ativos financeiros */
  ativosFinanceiros: {
    origemCapital: string;
    /** Saldo consolidado no banco (BRL) — numerador do share of wallet. */
    saldoConsolidadoBanco: number;
  };
  /** 5 — Ativos não financeiros */
  ativosNaoFinanceiros: {
    imoveisProprios: number;
    imoveisInvestimento?: KYCImovelInvestimento;
    imoveisExterior: number;
    empresas: KYCEmpresa[];
  };
  /** 6 — Fluxo de caixa & alertas */
  fluxoCaixa: {
    despesasFixas: KYCDespesaFixa[];
    doacoes: { realiza: boolean; descricao?: string };
    alertas: KYCAlerta[];
    /** Resumo IA mock. */
    resumoIAGastos: string;
  };
  /** 7 — Posição internacional */
  posicaoInternacional: {
    contaInternacional: boolean;
    investeExterior: boolean;
    valorExterior?: number;
  };
  /** 8 — Planejamentos */
  planejamentos: {
    momentoDeVida: string;
  };
  /** 9 — Proteção */
  protecao: {
    /** Estado do planejamento sucessório, como o dossiê descreve. */
    planejamentoSucessorio: string;
    segurosExternos: KYCSeguroExterno[];
  };
}

/* ------------------------------------------------------------------ */
/* Step 2 — Cash Flow                                                  */
/* ------------------------------------------------------------------ */

export type IncomeKind =
  | "salary"
  | "pro_labore"
  | "rent"
  | "investments"
  | "pension"
  | "bonus"
  | "plr"
  | "thirteenth"
  | "other";

/** Periodicity for non-recurring (one-time) income events. */
export type Periodicity = "once" | "annual" | "thirteenth";

export type ExpenseCategory =
  | "housing"
  | "living"
  | "education"
  | "health"
  | "debt"
  | "card"
  | "vehicle"
  | "taxes"
  | "insurance"
  | "lifestyle"
  | "other";

export interface IncomeItem {
  id: string;
  label: string;
  /** Monthly amount in BRL (for recurring income). For one-time events this is the event amount. */
  monthly: number;
  kind: IncomeKind;
  /** Recurring monthly income (default) vs a one-time event (bonus / PLR / 13º). */
  recurring?: boolean;
  /** ISO date for one-time events. */
  eventDate?: string;
  /** Periodicity for non-recurring income. */
  periodicity?: Periodicity;
}

export interface ExpenseItem {
  id: string;
  label: string;
  /** Monthly amount in BRL. */
  monthly: number;
  category: ExpenseCategory;
  /** Essential (primary) vs discretionary (secondary). Defaults to essential. */
  primary?: boolean;
  /** Optional free-text sub-category (e.g. card spend bucket: IR / IPVA / IPTU). */
  subcategory?: string;
}

/** How the retirement income need is derived from current income. */
export interface RetirementIncomeConfig {
  /** Target retirement income as a % of current income, or a nominal monthly BRL. */
  mode: "percent" | "nominal";
  value: number;
  /** Add an estimated INSS benefit as continuing retirement income. */
  inss: boolean;
}

export interface CashFlow {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  /** Retirement income target derived from current income (Step Despesas). */
  retirementIncome?: RetirementIncomeConfig;
}

/* ------------------------------------------------------------------ */
/* Step 3 — Net Worth (Financial Accounts + Liabilities)               */
/* ------------------------------------------------------------------ */

export type AssetClass =
  | "cash"
  | "investments"
  | "pension"
  | "real_estate"
  | "vehicle"
  | "foreign"
  | "fgts"
  | "business"
  | "other";

/** Real-estate property type (when assetClass = real_estate). */
export type PropertyType = "farm" | "house" | "apartment" | "land" | "commercial";

/** Asset ownership (titularidade). */
export type AssetOwnership = "individual" | "joint" | "spouse";

/** Supported holding currencies (multi-currency assets). */
export type CurrencyCode = "BRL" | "USD" | "EUR" | "GBP";

export type LiabilityKind =
  | "mortgage"
  | "auto"
  | "personal"
  | "card"
  | "consigned"
  | "other";

export interface Asset {
  id: string;
  label: string;
  /** Current value, expressed in `currency` (BRL when omitted). */
  value: number;
  assetClass: AssetClass;
  /** Counts toward the liquidity / emergency reserve view. */
  liquid: boolean;
  /** For real_estate: the property type. */
  propertyType?: PropertyType;
  /** Ownership / titularidade. */
  ownership?: AssetOwnership;
  /** Holding currency (defaults to BRL). */
  currency?: CurrencyCode;
  /** BRL per 1 unit of `currency` (used to convert non-BRL values). */
  fxRate?: number;
  /** For fgts: planned date of use (ISO). */
  fgtsUseDate?: string;
}

export interface Liability {
  id: string;
  label: string;
  /** Outstanding balance in BRL (saldo devedor). */
  balance: number;
  kind: LiabilityKind;
  /** Effective annual rate (%), where known. */
  annualRate?: number;
  /** Remaining term in months (prazo). */
  termMonths?: number;
  /** Monthly payment / installment in BRL (parcela). */
  monthlyPayment?: number;
  /** Whether the debt is secured by a guarantee/collateral (garantia). */
  hasGuarantee?: boolean;
  /** The financed asset this debt is tied to (financiamento ↔ bem). */
  linkedAssetId?: string;
}

export interface NetWorth {
  assets: Asset[];
  liabilities: Liability[];
}

/* ------------------------------------------------------------------ */
/* Step 4 — Risk Profile & Suitability (Assessment)                    */
/* ------------------------------------------------------------------ */

export interface SuitabilityQuestion {
  id: string;
  /** i18n key for the prompt. */
  promptKey: string;
  options: { value: number; labelKey: string }[];
}

export interface Suitability {
  /** Map of questionId -> chosen option value. */
  answers: Record<string, number>;
  /** 0..100 risk score (computed). */
  score?: number;
  profile?: RiskProfile;
  /** i18n keys of any surfaced suitability flags. */
  flags: string[];
}

/* ------------------------------------------------------------------ */
/* Step 5 — Life Goals (Financial Goal)                                */
/* ------------------------------------------------------------------ */

export type GoalType =
  | "retirement"
  | "education"
  | "property"
  | "travel"
  | "emergency_reserve"
  | "legacy"
  | "protection"
  | "custom";

export type GoalPriority = "high" | "medium" | "low";

export interface Goal {
  id: string;
  type: GoalType;
  /** Free-text label (falls back to a localized default for the type). */
  label?: string;
  /** Target amount in BRL. */
  targetAmount: number;
  /** Target calendar year. */
  targetYear: number;
  priority: GoalPriority;
  /** Amount already earmarked toward this goal. */
  currentAmount: number;
  /** Optional dedicated monthly contribution. */
  monthlyContribution?: number;
}

/* ------------------------------------------------------------------ */
/* Step 6 — Scenario Simulation (planning engine I/O)                  */
/* ------------------------------------------------------------------ */

export type GrowthScenario =
  | "base"
  | "cautious"
  | "conservative"
  | "stressed"
  | "custom";

export interface ScenarioAssumptions {
  /** Extra monthly contribution toward the plan (BRL). */
  monthlyContribution: number;
  retirementAge: number;
  /** Expected annual real return (%, above inflation). */
  expectedRealReturn: number;
  /** Assumed annual inflation (%). */
  inflation: number;
  growthScenario: GrowthScenario;
}

export interface ProjectionPoint {
  year: number;
  age: number;
  /** Projected investable wealth at year end (real BRL). */
  wealth: number;
  /** Cumulative contributions to date (real BRL). */
  contributions: number;
  /** Annual income available that year (real BRL). */
  income: number;
  /** Annual spending need that year (real BRL). */
  needs: number;
}

export interface GoalFunding {
  goalId: string;
  /** 0..100 funded percentage at the goal's target year. */
  fundedPct: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  /** Investable wealth at the chosen retirement age (real BRL). */
  wealthAtRetirement: number;
  /** Years the plan funds spending in retirement before depletion. */
  retirementDurationYears: number;
  /** 0..100 deterministic probability-of-success indicator. */
  probabilityOfSuccess: number;
  /** Wealth remaining at end of planning horizon (real BRL). */
  estateAtDeath: number;
  goalFunding: GoalFunding[];
  /** Monthly real income gap at retirement; negative = shortfall. */
  incomeGap: number;
}

export interface Scenario {
  id: string;
  name: string;
  assumptions: ScenarioAssumptions;
  result?: ProjectionResult;
  /** ISO timestamp. */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Step 7 — Review & Approval                                          */
/* ------------------------------------------------------------------ */

export type ApprovalStatus = "draft" | "in_review" | "approved";

/* ------------------------------------------------------------------ */
/* Advisor copilot events                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Life events — financial cashflow events on the dynamic timeline       */
/* ------------------------------------------------------------------ */

/** Direction of a life event's cash impact (distinct from advisor events). */
export type LifeEventKind = "outflow" | "inflow";

/**
 * A financial life event placed on the wealth/cash-flow timeline. The `year` is
 * the drag target; the projection consumes these as one-time (or recurring)
 * inflows/outflows. Separate from `AdvisorEvent` (advisor agenda).
 */
export interface LifeEvent {
  id: string;
  /** Preset key for icon/label/category ("custom" for ad-hoc events). */
  presetKey: string;
  /** Optional label override (falls back to the preset's localized label). */
  label?: string;
  kind: LifeEventKind;
  /** Calendar year the event lands on (or starts, for recurring). */
  year: number;
  /** Month 1–12 within the year (engine C1). Absent = year-end (v2 parity). */
  month?: number;
  /** Amount in BRL (always positive; sign comes from `kind`). */
  amount: number;
  /** When true, applies annually over [year, endYear] instead of once. */
  recurring?: boolean;
  endYear?: number;
  /** Optional link to a goal this event relates to (informational in v5). */
  goalId?: string;
}

/** v5 — full-case variant for A/B/C comparison ("Planos"). */
export type VariantColor = "blue" | "green" | "orange" | "purple";

export interface CaseVariant {
  id: string;
  name: string;
  color: VariantColor;
  /** The comparison baseline (exactly one per set). */
  isRef: boolean;
  /** Deep snapshot of the whole case (data + scenarios + events). */
  plan: Plan;
}

export type AdvisorEventType =
  | "review"
  | "rebalancing"
  | "contribution"
  | "meeting"
  | "other";

export interface AdvisorEvent {
  id: string;
  title: string;
  /** ISO date. */
  date: string;
  type: AdvisorEventType;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* The whole plan (Financial Plan) + journey progress                  */
/* ------------------------------------------------------------------ */

export type JourneyStepId =
  | "profile"
  | "cashflow"
  | "networth"
  | "suitability"
  | "goals"
  | "scenarios"
  | "review";

export interface Plan {
  clientId: string;
  clientProfile: ClientProfile;
  cashFlow: CashFlow;
  netWorth: NetWorth;
  suitability: Suitability;
  goals: Goal[];
  scenarios: Scenario[];
  selectedScenarioId?: string;
  approvalStatus: ApprovalStatus;
  events: AdvisorEvent[];
  /** Financial life events on the dynamic timeline (feed the projection). */
  lifeEvents?: LifeEvent[];
  /** Per-plan overrides of the planning premises (falls back to DEFAULT_PREMISES). */
  premises?: Premises;
}

/** Lightweight client card used on the entry/overview screen. */
export interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
  segment: Segment;
  city?: string;
  state?: string;
  age: number;
  /** One-line persona descriptor (i18n key). */
  taglineKey: string;
  /** 0..100 completeness of the plan across the journey. */
  completeness: number;
  approvalStatus: ApprovalStatus;
  /** Investable wealth teaser (BRL). */
  investable: number;
  /** ISO timestamp the dossier was received from the bank (inbound). */
  receivedAt?: string;
}

/** A team-saved persona — lightweight row from the shared library (vision.plans). */
export interface SavedPersona {
  clientId: string;
  name: string;
  author: string | null;
  segment: Segment;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Standalone engine: phases, cross-sell, outbound payload             */
/* ------------------------------------------------------------------ */

/** When a client dossier is loaded, which phase of the engine is active. */
export type EnginePhase = "simulate" | "output";

export type Fit = "high" | "medium" | "low";

/** v7 — where a cross-sell signal came from (shown on the card + CRM payload). */
export interface SignalOrigin {
  /** "event" = timeline life event · "plan" = plan element (goal/gap/profile). */
  tipo: "event" | "plan";
  /** Free-text label (event custom name, goal label) — wins over the keys. */
  label?: string;
  /** Event preset key — UI resolves via `lifeEvents.preset.*`. */
  presetKey?: string;
  /** Plan-element i18n key — UI resolves via `crosssell.origin.*`. */
  originKey?: string;
  /** Calendar year, when the source has one (events, goals). */
  ano?: number;
}

export interface CrossSellOpportunity {
  id: string;
  productKey: string;
  categoryKey: string;
  rationaleKey: string;
  /** v7 — numeric/text slots interpolated into the rationale template (engine-sourced). */
  rationaleParams?: Record<string, string | number>;
  fit: Fit;
  /** 0..100 fit score for ranking and display. */
  score: number;
  /** Illustrative BRL signal (coverage / AUM / balance at stake). */
  estimatedValue: number;
  /** v7 — signal origins (consolidated when multiple sources fire the same product). */
  origens?: SignalOrigin[];
}

export interface OutboundResult {
  ok: boolean;
  /** Salesforce record reference (stub). */
  ref: string;
  sentAt: string;
}

export interface OutputPayload {
  meta: { generatedAt: string; engineVersion: string; status: ApprovalStatus };
  client: { id: string; name: string; segment: Segment };
  riskProfile: RiskProfile | null;
  approvedScenario: {
    id: string;
    name: string;
    assumptions: ScenarioAssumptions;
  } | null;
  projection: {
    wealthAtRetirement: number;
    retirementDurationYears: number;
    probabilityOfSuccess: number;
    estateAtDeath: number;
    incomeGap: number;
  } | null;
  balanceSheet: { netWorth: number; liquidAssets: number };
  cashFlow: { surplus: number; savingsRate: number };
  goals: {
    type: GoalType;
    targetAmount: number;
    targetYear: number;
    fundedPct: number;
  }[];
  crossSell: {
    product: string;
    category: string;
    fit: Fit;
    score: number;
    estimatedValue: number;
    rationale: string;
    /** v7 — origem(ns) do sinal, legíveis (S7 do data mapping). */
    origemSinal: string[];
  }[];
}
