"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { RotateCcw, Sparkles } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import {
  buildPlanoIdealPayload,
  clampParams,
  heuristicParams,
  idealBounds,
  type IdealParams,
} from "@/lib/plano-ideal";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Plan, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

type Result = { racional: string; offline: boolean };

async function requestIdeal(payload: unknown): Promise<{ parametros: Partial<IdealParams>; racional: string }> {
  const res = await fetch("/api/plano-ideal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.headers.get("x-plano") === "no-key") throw new Error("no-key");
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.error) throw new Error(typeof body.error === "string" ? body.error : `http-${res.status}`);
  if (!body.parametros || typeof body.parametros !== "object") throw new Error("bad-shape");
  const parametros = body.parametros as Record<string, unknown>;
  // Some models nest racional inside parametros — accept either location.
  const racional =
    (typeof body.racional === "string" && body.racional) ||
    (typeof parametros.racional === "string" ? (parametros.racional as string) : "");
  return { parametros: parametros as Partial<IdealParams>, racional };
}

export function PlanoIdealButton({
  plan,
  assumptions,
  scenarioId,
}: {
  plan: Plan;
  assumptions: ScenarioAssumptions;
  scenarioId: string;
}) {
  const t = useTranslations();
  const updateScenarioAssumptions = useVisionStore((s) => s.updateScenarioAssumptions);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  /** Tween the four sliders from current → ideal so the curve/KPIs animate. */
  function applyAnimated(target: IdealParams) {
    if (animRef.current) cancelAnimationFrame(animRef.current); // never race two tweens
    const start = { ...assumptions };
    const t0 = performance.now();
    const dur = 750;
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      const lerp = (from: number, to: number) => from + (to - from) * e;
      updateScenarioAssumptions(scenarioId, {
        monthlyContribution: Math.round(lerp(start.monthlyContribution, target.monthlyContribution) / 100) * 100,
        retirementAge: Math.round(lerp(start.retirementAge, target.retirementAge)),
        expectedRealReturn: Math.round(lerp(start.expectedRealReturn, target.expectedRealReturn) * 4) / 4,
        inflation: Math.round(lerp(start.inflation, target.inflation) * 4) / 4,
        growthScenario: "custom",
      });
      animRef.current = k < 1 ? requestAnimationFrame(frame) : null;
    };
    animRef.current = requestAnimationFrame(frame);
  }

  async function generate() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setStep(0);
    stepTimer.current = setInterval(() => setStep((s) => (s + 1) % 3), 1100);

    const payload = buildPlanoIdealPayload(plan, assumptions);
    const bounds = idealBounds(plan);
    const attempt = async (): Promise<Result & { params: IdealParams }> => {
      const out = await requestIdeal(payload);
      return {
        params: clampParams(out.parametros, bounds),
        racional: out.racional || t("planoIdeal.offlineRacional"),
        offline: false,
      };
    };

    let params: IdealParams;
    let res: Result;
    try {
      const ok = await attempt();
      params = ok.params;
      res = { racional: ok.racional, offline: false };
    } catch (err) {
      // No point retrying when the API key is absent — go straight to offline.
      const noKey = err instanceof Error && err.message === "no-key";
      let ok: (Result & { params: IdealParams }) | null = null;
      if (!noKey) {
        try {
          ok = await attempt();
        } catch {
          ok = null;
        }
      }
      if (ok) {
        params = ok.params;
        res = { racional: ok.racional, offline: false };
      } else {
        params = heuristicParams(plan, assumptions); // deterministic offline
        res = { racional: t("planoIdeal.offlineRacional"), offline: true };
      }
    }

    if (stepTimer.current) clearInterval(stepTimer.current);
    setLoading(false);
    applyAnimated(params);
    setResult(res);
    toast.success(t("planoIdeal.applied"));
  }

  const steps = [t("planoIdeal.step1"), t("planoIdeal.step2"), t("planoIdeal.step3")];

  return (
    <div className="space-y-3">
      <Button className="w-full glow-primary" disabled={loading} onClick={generate}>
        <Sparkles className="size-4" />
        {loading ? steps[step] : t("planoIdeal.button")}
      </Button>

      {result && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              {t("planoIdeal.racionalTitle")}
              {result.offline && (
                <span className="rounded-full bg-warning-muted px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                  {t("planoIdeal.offline")}
                </span>
              )}
            </span>
            <Button variant="ghost" size="xs" onClick={generate} disabled={loading}>
              <RotateCcw className="size-3.5" />
              {t("planoIdeal.regenerate")}
            </Button>
          </div>
          <p className={cn("text-xs leading-relaxed text-foreground/80")}>{result.racional}</p>
        </div>
      )}
    </div>
  );
}
