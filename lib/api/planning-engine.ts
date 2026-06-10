/**
 * Planning engine service — typed stub for the aixigo / ALTO engine.
 *
 * The journey talks to this contract, never to the implementation. To go live,
 * replace `mockPlanningEngine` with an HTTP-backed implementation of the same
 * `PlanningEngine` interface — a single-file swap. Request/response types are
 * written to read like a real API contract.
 */

import type { Goal, LifeEvent, ProjectionResult, RiskProfile } from "@/lib/types";
import {
  PLANNING_HORIZON_AGE,
  project,
  scoreSuitability,
  type ProjectionInput,
} from "@/lib/calc";

/* ----------------------------- Projection ----------------------------- */

export interface ProjectionRequest {
  currentAge: number;
  retirementAge: number;
  /** Defaults to the planning horizon (95) if omitted. */
  lifeExpectancy?: number;
  /** Investable wealth today (real BRL). */
  investableNow: number;
  /** Total monthly savings directed at the plan (real BRL). */
  monthlyContribution: number;
  /** Expected annual real return as a percentage, e.g. 5 for IPCA+5%. */
  expectedRealReturn: number;
  /** Assumed annual inflation as a percentage (carried for display). */
  inflation: number;
  /** Current annual earned income (real BRL). */
  annualIncomeNow: number;
  /** Annual spending need in retirement (real BRL). */
  annualNeeds: number;
  /** Annual income continuing into retirement — INSS, rent, pension (real BRL). */
  annualOtherIncome: number;
  goals: Goal[];
  /** Financial life events on the timeline. */
  lifeEvents?: LifeEvent[];
}

/* ---------------------------- Suitability ----------------------------- */

export interface SuitabilityRequest {
  /** Map of questionId -> chosen option value (0..3 scale). */
  answers: Record<string, number>;
  context?: {
    dependents?: number;
    soleProvider?: boolean;
    yearsToRetirement?: number;
  };
}

export interface SuitabilityResponse {
  /** 0..100 risk score. */
  score: number;
  profile: RiskProfile;
  /** i18n keys of surfaced suitability flags. */
  flags: string[];
}

/* ------------------------------ Contract ------------------------------ */

export interface PlanningEngine {
  runProjection(input: ProjectionRequest): Promise<ProjectionResult>;
  computeSuitability(input: SuitabilityRequest): Promise<SuitabilityResponse>;
}

/** Map the API request shape to the calc engine's input (percent → decimal). */
export function requestToInput(input: ProjectionRequest): ProjectionInput {
  return {
    currentAge: input.currentAge,
    retirementAge: input.retirementAge,
    lifeExpectancy: input.lifeExpectancy ?? PLANNING_HORIZON_AGE,
    investableNow: input.investableNow,
    monthlyContribution: input.monthlyContribution,
    realReturn: input.expectedRealReturn / 100,
    annualIncomeNow: input.annualIncomeNow,
    annualNeeds: input.annualNeeds,
    annualOtherIncome: input.annualOtherIncome,
    goals: input.goals,
    lifeEvents: input.lifeEvents,
  };
}

/* ------------------------------- Mock --------------------------------- */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockPlanningEngine: PlanningEngine = {
  async runProjection(input) {
    await delay(420);
    return project(requestToInput(input));
  },

  async computeSuitability(input) {
    await delay(300);
    const scored = scoreSuitability(input.answers);
    const score = scored?.score ?? 0;
    const profile = scored?.profile ?? "conservative";

    const flags: string[] = [];
    const ctx = input.context ?? {};
    if (ctx.soleProvider) flags.push("flags.soleProvider");
    if ((ctx.dependents ?? 0) >= 2) flags.push("flags.multipleDependents");
    if ((ctx.yearsToRetirement ?? 99) <= 7) flags.push("flags.shortHorizon");
    if (profile === "aggressive" && (ctx.yearsToRetirement ?? 99) <= 7) {
      flags.push("flags.profileHorizonMismatch");
    }
    return { score, profile, flags };
  },
};

/** The engine the app uses. Swap this binding to go from mock to live. */
export const planningEngine: PlanningEngine = mockPlanningEngine;
