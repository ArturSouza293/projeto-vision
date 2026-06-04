"use client";

/**
 * Project Vision — global plan store (Zustand + persist).
 *
 * Single source of truth for the advisor journey: the active plan, locale and
 * journey UI state, plus every domain action. Persisted to localStorage so the
 * whole plan survives a full reload. Async actions delegate to the swappable
 * service stubs in `/lib/api`.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { salesforce } from "@/lib/api/salesforce";
import { personaLibrary } from "@/lib/api/library";
import { planningEngine } from "@/lib/api/planning-engine";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getPremises, type Premises } from "@/lib/premises";
import { ageFromDob } from "@/lib/calc";
import { blankPlan, buildProjectionRequest, defaultAssumptions, defaultGoals } from "@/lib/plan";
import type {
  AdvisorEvent,
  Asset,
  Dependent,
  ExpenseItem,
  Goal,
  IncomeItem,
  Liability,
  Locale,
  Plan,
  RetirementIncomeConfig,
  SavedPersona,
  Scenario,
  ScenarioAssumptions,
  ClientProfile,
  EnginePhase,
  OutboundResult,
  OutputPayload,
} from "@/lib/types";

export type DataTab =
  | "profile"
  | "income"
  | "expense"
  | "networth"
  | "suitability"
  | "goals";

function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Keep the last 8 named plans the advisor touched, most-recent first. */
function upsertRecent(list: Plan[], plan: Plan | null): Plan[] {
  if (!plan || !plan.clientProfile.firstName.trim()) return list;
  return [plan, ...list.filter((p) => p.clientId !== plan.clientId)].slice(0, 8);
}

export interface VisionStore {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  locale: Locale;
  setLocale: (l: Locale) => void;

  // Shared persona library (Supabase)
  advisorName: string;
  setAdvisorName: (name: string) => void;
  savedPersonas: SavedPersona[];
  savedLoading: boolean;
  fetchSavedPersonas: () => Promise<void>;
  savePlan: () => Promise<void>;
  loadSavedPersona: (clientId: string) => Promise<void>;
  deleteSavedPersona: (clientId: string) => Promise<void>;

  // Session + navigation
  logout: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  recentPlans: Plan[];
  loadRecentPlan: (clientId: string) => void;

  activePlan: Plan | null;
  phase: EnginePhase;
  setPhase: (p: EnginePhase) => void;

  dataDrawerOpen: boolean;
  setDataDrawerOpen: (v: boolean) => void;
  dataTab: DataTab;
  setDataTab: (t: DataTab) => void;

  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  toggleCopilot: () => void;

  loadingPlan: boolean;
  busy: boolean;
  outbound: OutboundResult | null;

  // Plan lifecycle
  loadClient: (clientId: string) => Promise<void>;
  startNewClient: () => void;
  closePlan: () => void;
  sendToSalesforce: (payload: OutputPayload) => Promise<void>;

  // Step 1 — profile
  updateClientProfile: (patch: Partial<ClientProfile>) => void;
  addDependent: () => void;
  updateDependent: (id: string, patch: Partial<Dependent>) => void;
  removeDependent: (id: string) => void;
  updateRetirementIncome: (patch: Partial<RetirementIncomeConfig>) => void;

  // Planning premises (FPSB) — per-plan overrides of DEFAULT_PREMISES
  updatePremises: (patch: Partial<Premises>) => void;
  resetPremises: () => void;

  // Step 2 — cash flow
  addIncome: () => void;
  updateIncome: (id: string, patch: Partial<IncomeItem>) => void;
  removeIncome: (id: string) => void;
  addExpense: () => void;
  updateExpense: (id: string, patch: Partial<ExpenseItem>) => void;
  removeExpense: (id: string) => void;

  // Step 3 — net worth
  addAsset: () => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  addLiability: () => void;
  updateLiability: (id: string, patch: Partial<Liability>) => void;
  removeLiability: (id: string) => void;

  // Step 4 — suitability
  setSuitabilityAnswer: (questionId: string, value: number) => void;
  runSuitability: () => Promise<void>;

  // Step 5 — goals
  addGoal: (goal?: Partial<Goal>) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  seedDefaultGoals: () => void;

  // Step 6 — scenarios
  addScenario: (name?: string) => string;
  updateScenarioAssumptions: (id: string, patch: Partial<ScenarioAssumptions>) => void;
  runScenario: (id: string) => Promise<void>;
  selectScenario: (id: string) => void;
  removeScenario: (id: string) => void;

  // Step 7 — approval
  approvePlan: () => void;
  reopenPlan: () => void;

  // Copilot events
  addEvent: (event: Omit<AdvisorEvent, "id">) => void;
  removeEvent: (id: string) => void;
}

/** Apply an immutable update to the active plan, if one is loaded. */
function patchPlan(
  set: (fn: (s: VisionStore) => Partial<VisionStore>) => void,
  updater: (plan: Plan) => Plan,
) {
  set((s) => (s.activePlan ? { activePlan: updater(s.activePlan) } : {}));
}

export const useVisionStore = create<VisionStore>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      locale: "en",
      setLocale: (l) => set({ locale: l }),

      advisorName: "",
      setAdvisorName: (name) => set({ advisorName: name }),
      savedPersonas: [],
      savedLoading: false,
      async fetchSavedPersonas() {
        set({ savedLoading: true });
        try {
          const savedPersonas = await personaLibrary.list();
          set({ savedPersonas, savedLoading: false });
        } catch {
          set({ savedPersonas: [], savedLoading: false });
        }
      },
      async savePlan() {
        const { activePlan, advisorName } = get();
        if (!activePlan) return;
        // The plan is always persisted locally (Zustand persist) — pin it to recents.
        set((s) => ({ recentPlans: upsertRecent(s.recentPlans, activePlan) }));
        // Best-effort sync to the shared team library when the DB is configured.
        if (isSupabaseConfigured) {
          await personaLibrary.save(activePlan, advisorName);
          void get().fetchSavedPersonas();
        }
      },
      async loadSavedPersona(clientId) {
        set({ loadingPlan: true });
        try {
          const plan = await personaLibrary.load(clientId);
          set((s) => ({
            recentPlans: upsertRecent(s.recentPlans, s.activePlan),
            activePlan: plan,
            phase: "simulate",
            outbound: null,
            loadingPlan: false,
            sidebarOpen: false,
          }));
        } catch (e) {
          set({ loadingPlan: false });
          throw e;
        }
      },
      async deleteSavedPersona(clientId) {
        await personaLibrary.remove(clientId);
        void get().fetchSavedPersonas();
      },

      sidebarOpen: false,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      recentPlans: [],
      logout() {
        set((s) => ({
          recentPlans: upsertRecent(s.recentPlans, s.activePlan),
          advisorName: "",
          activePlan: null,
          phase: "simulate",
          outbound: null,
          copilotOpen: false,
          dataDrawerOpen: false,
          sidebarOpen: false,
        }));
      },
      loadRecentPlan(clientId) {
        set((s) => {
          const target = s.recentPlans.find((p) => p.clientId === clientId);
          if (!target) return {};
          return {
            recentPlans: upsertRecent(s.recentPlans, s.activePlan),
            activePlan: target,
            phase: "simulate",
            outbound: null,
            dataDrawerOpen: false,
            sidebarOpen: false,
          };
        });
      },

      activePlan: null,
      phase: "simulate",
      setPhase: (p) => set({ phase: p }),

      dataDrawerOpen: false,
      setDataDrawerOpen: (v) => set({ dataDrawerOpen: v }),
      dataTab: "profile",
      setDataTab: (t) => set({ dataTab: t, dataDrawerOpen: true }),

      copilotOpen: false,
      setCopilotOpen: (v) => set({ copilotOpen: v }),
      toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),

      loadingPlan: false,
      busy: false,
      outbound: null,

      async loadClient(clientId) {
        set({ loadingPlan: true });
        try {
          const plan = await salesforce.inbound.fetchDossier(clientId);
          set((s) => ({
            recentPlans: upsertRecent(s.recentPlans, s.activePlan),
            activePlan: plan,
            phase: "simulate",
            outbound: null,
            loadingPlan: false,
            sidebarOpen: false,
          }));
        } catch (e) {
          set({ loadingPlan: false });
          throw e;
        }
      },

      startNewClient() {
        set((s) => ({
          recentPlans: upsertRecent(s.recentPlans, s.activePlan),
          activePlan: blankPlan(uid("client")),
          phase: "simulate",
          outbound: null,
          dataTab: "profile",
          dataDrawerOpen: true,
          sidebarOpen: false,
        }));
      },

      closePlan() {
        set((s) => ({
          recentPlans: upsertRecent(s.recentPlans, s.activePlan),
          activePlan: null,
          phase: "simulate",
          outbound: null,
          copilotOpen: false,
          dataDrawerOpen: false,
          sidebarOpen: false,
        }));
      },

      async sendToSalesforce(payload) {
        set({ busy: true });
        try {
          const res = await salesforce.outbound.pushPlan(payload);
          set({ outbound: res });
        } finally {
          set({ busy: false });
        }
      },

      updateClientProfile(patch) {
        patchPlan(set, (p) => ({
          ...p,
          clientProfile: { ...p.clientProfile, ...patch },
        }));
      },
      addDependent() {
        patchPlan(set, (p) => ({
          ...p,
          clientProfile: {
            ...p.clientProfile,
            dependentsDetail: [
              ...(p.clientProfile.dependentsDetail ?? []),
              { id: uid("dep"), name: "", relation: "child", age: 0 },
            ],
          },
        }));
      },
      updateDependent(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          clientProfile: {
            ...p.clientProfile,
            dependentsDetail: (p.clientProfile.dependentsDetail ?? []).map((d) =>
              d.id === id ? { ...d, ...patch } : d,
            ),
          },
        }));
      },
      removeDependent(id) {
        patchPlan(set, (p) => ({
          ...p,
          clientProfile: {
            ...p.clientProfile,
            dependentsDetail: (p.clientProfile.dependentsDetail ?? []).filter(
              (d) => d.id !== id,
            ),
          },
        }));
      },
      updateRetirementIncome(patch) {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            retirementIncome: {
              mode: "percent",
              value: 70,
              inss: true,
              ...p.cashFlow.retirementIncome,
              ...patch,
            },
          },
        }));
      },

      updatePremises(patch) {
        patchPlan(set, (p) => ({ ...p, premises: { ...getPremises(p), ...patch } }));
      },
      resetPremises() {
        patchPlan(set, (p) => ({ ...p, premises: undefined }));
      },

      addIncome() {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            incomes: [
              ...p.cashFlow.incomes,
              { id: uid("inc"), label: "", monthly: 0, kind: "salary", recurring: true },
            ],
          },
        }));
      },
      updateIncome(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            incomes: p.cashFlow.incomes.map((i) =>
              i.id === id ? { ...i, ...patch } : i,
            ),
          },
        }));
      },
      removeIncome(id) {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            incomes: p.cashFlow.incomes.filter((i) => i.id !== id),
          },
        }));
      },
      addExpense() {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            expenses: [
              ...p.cashFlow.expenses,
              { id: uid("exp"), label: "", monthly: 0, category: "living", primary: true },
            ],
          },
        }));
      },
      updateExpense(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            expenses: p.cashFlow.expenses.map((e) =>
              e.id === id ? { ...e, ...patch } : e,
            ),
          },
        }));
      },
      removeExpense(id) {
        patchPlan(set, (p) => ({
          ...p,
          cashFlow: {
            ...p.cashFlow,
            expenses: p.cashFlow.expenses.filter((e) => e.id !== id),
          },
        }));
      },

      addAsset() {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            assets: [
              ...p.netWorth.assets,
              { id: uid("ast"), label: "", value: 0, assetClass: "investments", liquid: true },
            ],
          },
        }));
      },
      updateAsset(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            assets: p.netWorth.assets.map((a) =>
              a.id === id ? { ...a, ...patch } : a,
            ),
          },
        }));
      },
      removeAsset(id) {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            assets: p.netWorth.assets.filter((a) => a.id !== id),
          },
        }));
      },
      addLiability() {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            liabilities: [
              ...p.netWorth.liabilities,
              { id: uid("lia"), label: "", balance: 0, kind: "personal" },
            ],
          },
        }));
      },
      updateLiability(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            liabilities: p.netWorth.liabilities.map((l) =>
              l.id === id ? { ...l, ...patch } : l,
            ),
          },
        }));
      },
      removeLiability(id) {
        patchPlan(set, (p) => ({
          ...p,
          netWorth: {
            ...p.netWorth,
            liabilities: p.netWorth.liabilities.filter((l) => l.id !== id),
          },
        }));
      },

      setSuitabilityAnswer(questionId, value) {
        patchPlan(set, (p) => ({
          ...p,
          suitability: {
            ...p.suitability,
            answers: { ...p.suitability.answers, [questionId]: value },
          },
        }));
      },
      async runSuitability() {
        const plan = get().activePlan;
        if (!plan) return;
        set({ busy: true });
        try {
          const age = ageFromDob(plan.clientProfile.dateOfBirth);
          const retirementAge =
            plan.scenarios.find((s) => s.id === plan.selectedScenarioId)?.assumptions
              .retirementAge ?? 65;
          const res = await planningEngine.computeSuitability({
            answers: plan.suitability.answers,
            context: {
              dependents: plan.clientProfile.dependents,
              soleProvider:
                !plan.clientProfile.hasPartner && plan.clientProfile.dependents > 0,
              yearsToRetirement: retirementAge - age,
            },
          });
          patchPlan(set, (p) => ({
            ...p,
            suitability: {
              ...p.suitability,
              score: res.score,
              profile: res.profile,
              flags: res.flags,
            },
          }));
        } finally {
          set({ busy: false });
        }
      },

      addGoal(goal) {
        patchPlan(set, (p) => ({
          ...p,
          goals: [
            ...p.goals,
            {
              id: uid("goal"),
              type: "custom",
              targetAmount: 100000,
              targetYear: new Date().getFullYear() + 10,
              priority: "medium",
              currentAmount: 0,
              ...goal,
            },
          ],
        }));
      },
      updateGoal(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          goals: p.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        }));
      },
      removeGoal(id) {
        patchPlan(set, (p) => ({
          ...p,
          goals: p.goals.filter((g) => g.id !== id),
        }));
      },
      seedDefaultGoals() {
        const plan = get().activePlan;
        if (!plan || plan.goals.length > 0) return;
        const goals = defaultGoals(plan);
        patchPlan(set, (p) => ({ ...p, goals }));
      },

      addScenario(name) {
        const plan = get().activePlan;
        if (!plan) return "";
        const id = uid("scn");
        const scenario: Scenario = {
          id,
          name: name ?? `Cenário ${plan.scenarios.length + 1}`,
          assumptions: defaultAssumptions(plan),
          createdAt: new Date().toISOString(),
        };
        patchPlan(set, (p) => ({
          ...p,
          scenarios: [...p.scenarios, scenario],
          selectedScenarioId: id,
        }));
        return id;
      },
      updateScenarioAssumptions(id, patch) {
        patchPlan(set, (p) => ({
          ...p,
          scenarios: p.scenarios.map((s) =>
            s.id === id
              ? { ...s, assumptions: { ...s.assumptions, ...patch }, result: undefined }
              : s,
          ),
        }));
      },
      async runScenario(id) {
        const plan = get().activePlan;
        if (!plan) return;
        const scenario = plan.scenarios.find((s) => s.id === id);
        if (!scenario) return;
        set({ busy: true });
        try {
          const result = await planningEngine.runProjection(
            buildProjectionRequest(plan, scenario.assumptions),
          );
          patchPlan(set, (p) => ({
            ...p,
            scenarios: p.scenarios.map((s) => (s.id === id ? { ...s, result } : s)),
          }));
        } finally {
          set({ busy: false });
        }
      },
      selectScenario(id) {
        patchPlan(set, (p) => ({ ...p, selectedScenarioId: id }));
      },
      removeScenario(id) {
        patchPlan(set, (p) => {
          const scenarios = p.scenarios.filter((s) => s.id !== id);
          return {
            ...p,
            scenarios,
            selectedScenarioId:
              p.selectedScenarioId === id ? scenarios[0]?.id : p.selectedScenarioId,
          };
        });
      },

      approvePlan() {
        patchPlan(set, (p) => ({ ...p, approvalStatus: "approved" }));
      },
      reopenPlan() {
        patchPlan(set, (p) => ({ ...p, approvalStatus: "draft" }));
      },

      addEvent(event) {
        patchPlan(set, (p) => ({
          ...p,
          events: [...p.events, { ...event, id: uid("evt") }],
        }));
      },
      removeEvent(id) {
        patchPlan(set, (p) => ({
          ...p,
          events: p.events.filter((e) => e.id !== id),
        }));
      },
    }),
    {
      name: "vision-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        activePlan: s.activePlan,
        phase: s.phase,
        advisorName: s.advisorName,
        recentPlans: s.recentPlans,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
