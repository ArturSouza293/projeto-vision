/**
 * Salesforce integration — typed stub for the bank's CRM as the engine's
 * INBOUND source (client dossiers arrive) and OUTBOUND sink (approved plan +
 * cross-sell payload goes back). The engine itself is standalone; this is just
 * the I/O boundary. Swap these mock implementations for real Salesforce calls
 * to go live — one file.
 */

import { ageFromDob, investableWealth } from "@/lib/calc";
import { planCompleteness } from "@/lib/plan";
import { PERSONA_META, SEED_PLANS } from "@/lib/mock/clients";
import type {
  ClientSummary,
  OutboundResult,
  OutputPayload,
  Plan,
} from "@/lib/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toSummary(plan: Plan, idx: number): ClientSummary {
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
    investable: investableWealth(plan.netWorth),
    receivedAt: new Date(Date.now() - (idx + 1) * 5_400_000).toISOString(),
  };
}

export interface SalesforceInbound {
  /** The queue of client dossiers received from the bank. */
  fetchQueue(): Promise<ClientSummary[]>;
  /** A full client dossier (deep copy). */
  fetchDossier(clientId: string): Promise<Plan>;
}

export interface SalesforceOutbound {
  /** Push the approved plan + cross-sell payload back to Salesforce. */
  pushPlan(payload: OutputPayload): Promise<OutboundResult>;
}

export interface SalesforceClient {
  inbound: SalesforceInbound;
  outbound: SalesforceOutbound;
}

const mockInbound: SalesforceInbound = {
  async fetchQueue() {
    await delay(300);
    return SEED_PLANS.map(toSummary);
  },
  async fetchDossier(clientId) {
    await delay(340);
    const found = SEED_PLANS.find((p) => p.clientId === clientId);
    if (!found) throw new Error(`Unknown client: ${clientId}`);
    return structuredClone(found);
  },
};

function ref(): string {
  const rand = Math.floor(Math.random() * 36 ** 8)
    .toString(36)
    .toUpperCase()
    .padStart(8, "0");
  return `a0S${rand}`;
}

const mockOutbound: SalesforceOutbound = {
  async pushPlan(_payload) {
    await delay(760);
    return { ok: true, ref: ref(), sentAt: new Date().toISOString() };
  },
};

/** The integration the app uses. Swap these bindings to go from mock to live. */
export const salesforce: SalesforceClient = {
  inbound: mockInbound,
  outbound: mockOutbound,
};
