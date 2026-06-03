/**
 * Shared persona library — reads/writes the `vision.plans` table so the team can
 * save and load client personas beyond the local session. The whole Plan lives
 * in a JSONB column; a few indexed columns (name, author, segment, updated_at)
 * power the listing. All methods no-op / throw cleanly when the DB isn't set up.
 */
import { supabase } from "@/lib/supabase/client";
import type { Plan, SavedPersona, Segment } from "@/lib/types";

const NOT_CONFIGURED = "not-configured";

export const personaLibrary = {
  /** List the team's saved personas (lightweight — does not fetch the plan blob). */
  async list(): Promise<SavedPersona[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("plans")
      .select("client_id, name, author, segment, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      clientId: String(r.client_id),
      name: (r.name as string) || "—",
      author: (r.author as string | null) ?? null,
      segment: ((r.segment as Segment) || "retail") as Segment,
      updatedAt: String(r.updated_at),
    }));
  },

  /** Load a full plan by client id. */
  async load(clientId: string): Promise<Plan> {
    if (!supabase) throw new Error(NOT_CONFIGURED);
    const { data, error } = await supabase
      .from("plans")
      .select("plan")
      .eq("client_id", clientId)
      .single();
    if (error) throw error;
    return (data as { plan: Plan }).plan;
  },

  /** Upsert the plan (keyed by clientId), tagged with the advisor's name. */
  async save(plan: Plan, author: string): Promise<void> {
    if (!supabase) throw new Error(NOT_CONFIGURED);
    const p = plan.clientProfile;
    const name =
      (p.partnerName ? `${p.firstName} & ${p.partnerName}` : `${p.firstName} ${p.lastName ?? ""}`).trim() ||
      "Sem nome";
    const { error } = await supabase.from("plans").upsert(
      {
        client_id: plan.clientId,
        name,
        author: author.trim() || null,
        segment: p.segment,
        approval_status: plan.approvalStatus,
        plan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
    if (error) throw error;
  },

  async remove(clientId: string): Promise<void> {
    if (!supabase) throw new Error(NOT_CONFIGURED);
    const { error } = await supabase.from("plans").delete().eq("client_id", clientId);
    if (error) throw error;
  },
};

export { NOT_CONFIGURED };
