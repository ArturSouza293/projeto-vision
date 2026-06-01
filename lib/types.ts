/**
 * Project Vision — domain model.
 *
 * Names intentionally echo Salesforce FSC objects (Person Account, Household,
 * Financial Account, Financial Goal, Assessment, Financial Plan) so the mock
 * service layer in `/lib/api` can later be swapped for real FSC / aixigo ALTO
 * contracts with minimal churn. See `/lib/api/fsc.ts` and
 * `/lib/api/planning-engine.ts`.
 */

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

  // Household
  hasPartner: boolean;
  partnerName?: string;

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

  segment: Segment;
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
  | "other";

export type ExpenseCategory =
  | "housing"
  | "living"
  | "education"
  | "health"
  | "debt"
  | "lifestyle"
  | "other";

export interface IncomeItem {
  id: string;
  label: string;
  /** Monthly amount in BRL. */
  monthly: number;
  kind: IncomeKind;
}

export interface ExpenseItem {
  id: string;
  label: string;
  /** Monthly amount in BRL. */
  monthly: number;
  category: ExpenseCategory;
}

export interface CashFlow {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
}

/* ------------------------------------------------------------------ */
/* Step 3 — Net Worth (Financial Accounts + Liabilities)               */
/* ------------------------------------------------------------------ */

export type AssetClass =
  | "cash"
  | "investments"
  | "pension"
  | "real_estate"
  | "business"
  | "other";

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
  /** Current value in BRL. */
  value: number;
  assetClass: AssetClass;
  /** Counts toward the liquidity / emergency reserve view. */
  liquid: boolean;
}

export interface Liability {
  id: string;
  label: string;
  /** Outstanding balance in BRL. */
  balance: number;
  kind: LiabilityKind;
  /** Effective annual rate (%), where known. */
  annualRate?: number;
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
}
