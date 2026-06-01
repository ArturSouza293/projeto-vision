/**
 * Salesforce Financial Services Cloud service — typed stub.
 *
 * Mirrors the reads/writes the journey needs against FSC objects (Person
 * Account, Financial Plan, Financial Account, Financial Goal). Replace
 * `mockFsc` with a real FSC-backed implementation of `FscService` to go live —
 * a single-file swap.
 */

import { ageFromDob } from "@/lib/calc";
import { planCompleteness } from "@/lib/plan";
import { PERSONA_META, SEED_PLANS } from "@/lib/mock/clients";
import type { ClientSummary, Plan } from "@/lib/types";

export interface SaveResult {
  ok: true;
  savedAt: string;
}

export interface FscService {
  /** Cards for the entry / overview screen. */
  listClients(): Promise<ClientSummary[]>;
  /** Full plan (deep copy) for a client. */
  getPlan(clientId: string): Promise<Plan>;
  /** Persist the working plan (stubbed). */
  savePlan(plan: Plan): Promise<SaveResult>;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toSummary(plan: Plan): ClientSummary {
  const p = plan.clientProfile;
  return {
    id: plan.clientId,
    firstName: p.firstName,
    lastName: p.lastName,
    partnerName: p.partnerName,
    segment: p.segment,
    city: p.city,
    state: p.state,
    age: ageFromDob(p.dateOfBirth),
    taglineKey: PERSONA_META[plan.clientId]?.taglineKey ?? "",
    completeness: planCompleteness(plan),
    approvalStatus: plan.approvalStatus,
  };
}

export const mockFsc: FscService = {
  async listClients() {
    await delay(280);
    return SEED_PLANS.map(toSummary);
  },

  async getPlan(clientId) {
    await delay(320);
    const found = SEED_PLANS.find((p) => p.clientId === clientId);
    if (!found) throw new Error(`Unknown client: ${clientId}`);
    return structuredClone(found);
  },

  async savePlan(_plan) {
    await delay(260);
    return { ok: true, savedAt: new Date().toISOString() };
  },
};

/** The service the app uses. Swap this binding to go from mock to live. */
export const fsc: FscService = mockFsc;
