"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Plus, Trash2, X } from "@/components/app/icons";
import { MoneyInput } from "@/components/app/number-field";
import { WealthArea } from "@/components/charts/wealth-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CUSTOM_PRESET, LIFE_EVENT_PRESETS, lifeEventPreset } from "@/lib/life-event-meta";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { LifeEvent, Plan, ProjectionPoint, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Chart plot insets: YAxis width (58) + left margin (8); right margin (8). */
const PLOT_LEFT = 66;
const PLOT_RIGHT = 8;

type DragState = { kind: "event"; id: string; year: number } | { kind: "retire"; year: number };

export function WealthTimeline({
  plan,
  assumptions,
  scenarioId,
  points,
  retirementYear,
  currentAge,
  retMin,
  retMax,
}: {
  plan: Plan;
  assumptions: ScenarioAssumptions;
  scenarioId: string;
  points: ProjectionPoint[];
  retirementYear: number;
  currentAge: number;
  retMin: number;
  retMax: number;
}) {
  const t = useTranslations();
  const addLifeEvent = useVisionStore((s) => s.addLifeEvent);
  const updateLifeEvent = useVisionStore((s) => s.updateLifeEvent);
  const removeLifeEvent = useVisionStore((s) => s.removeLifeEvent);
  const updateScenarioAssumptions = useVisionStore((s) => s.updateScenarioAssumptions);

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [ghost, setGhost] = useState<ProjectionPoint[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Tear down any in-flight drag listeners + pending frame if we unmount mid-drag
  // (switching scenario/persona) — otherwise leaked window listeners could mutate
  // a now-unrelated plan on the next pointerup.
  useEffect(
    () => () => {
      cleanupRef.current?.();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const thisYear = new Date().getFullYear();
  const minYear = points[0]?.year ?? thisYear;
  const maxYear = points[points.length - 1]?.year ?? thisYear + 1;
  const span = Math.max(1, maxYear - minYear);
  const leftPct = (y: number) => Math.max(0, Math.min(100, ((y - minYear) / span) * 100));
  const events = plan.lifeEvents ?? [];

  /** Map a clientX to a (snapped) calendar year using the track's plot rect. */
  function yearFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return minYear;
    const frac = (clientX - rect.left) / rect.width;
    return Math.round(minYear + frac * span);
  }

  /** Accumulation-phase clamp: events live between now and retirement (v1). */
  const clampEventYear = (y: number) => Math.max(thisYear, Math.min(retirementYear, y));
  const clampRetAge = (a: number) => Math.max(retMin, Math.min(retMax, a));

  /** Recompute the dimmed "what-if" curve on the next frame (coalesced). */
  function scheduleGhost(modPlan: Plan, a: ScenarioAssumptions) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setGhost(projectPlan(modPlan, a).points);
    });
  }

  function startEventDrag(e: React.PointerEvent, item: LifeEvent) {
    e.preventDefault();
    movedRef.current = false;
    const startX = e.clientX;
    function onMove(ev: PointerEvent) {
      if (Math.abs(ev.clientX - startX) > 3) movedRef.current = true;
      const year = clampEventYear(yearFromClientX(ev.clientX));
      setDrag({ kind: "event", id: item.id, year });
      scheduleGhost(
        { ...plan, lifeEvents: events.map((x) => (x.id === item.id ? { ...x, year } : x)) },
        assumptions,
      );
    }
    function onUp(ev: PointerEvent) {
      const commit = movedRef.current;
      const year = clampEventYear(yearFromClientX(ev.clientX));
      finish();
      if (commit) updateLifeEvent(item.id, { year });
      else setEditId((cur) => (cur === item.id ? null : item.id)); // tap = toggle editor
    }
    function finish() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", finish);
      cleanupRef.current = null;
      setDrag(null);
      setGhost(null);
    }
    cleanupRef.current = finish;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", finish);
  }

  function startRetireDrag(e: React.PointerEvent) {
    e.preventDefault();
    movedRef.current = false;
    const startX = e.clientX;
    function onMove(ev: PointerEvent) {
      if (Math.abs(ev.clientX - startX) > 3) movedRef.current = true;
      const age = clampRetAge(currentAge + (yearFromClientX(ev.clientX) - thisYear));
      setDrag({ kind: "retire", year: thisYear + (age - currentAge) });
      scheduleGhost(plan, { ...assumptions, retirementAge: age, growthScenario: "custom" });
    }
    function onUp(ev: PointerEvent) {
      const commit = movedRef.current;
      const age = clampRetAge(currentAge + (yearFromClientX(ev.clientX) - thisYear));
      finish();
      // A plain click must NOT force growthScenario:custom / clear the result.
      if (commit) updateScenarioAssumptions(scenarioId, { retirementAge: age, growthScenario: "custom" });
    }
    function finish() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", finish);
      cleanupRef.current = null;
      setDrag(null);
      setGhost(null);
    }
    cleanupRef.current = finish;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", finish);
  }

  function nudge(item: LifeEvent, delta: number) {
    updateLifeEvent(item.id, { year: clampEventYear(item.year + delta) });
  }

  function addPreset(presetKey: string) {
    const preset = lifeEventPreset(presetKey);
    const year = clampEventYear(thisYear + 5);
    const id = addLifeEvent({
      presetKey,
      kind: preset.kind,
      amount: preset.defaultAmount,
      year,
      recurring: preset.defaultDurationYears ? true : undefined,
      endYear: preset.defaultDurationYears ? clampEventYear(year + preset.defaultDurationYears) : undefined,
    });
    setEditId(id);
  }

  const retYearShown = drag?.kind === "retire" ? drag.year : retirementYear;
  const editing = editId ? events.find((e) => e.id === editId) : undefined;

  return (
    <div className="space-y-3">
      <WealthArea points={points} retirementYear={retirementYear} ghostPoints={ghost} />

      {/* Draggable life-events track, aligned to the chart's plot area */}
      <div style={{ paddingLeft: PLOT_LEFT, paddingRight: PLOT_RIGHT }}>
        <div ref={trackRef} className="relative h-px rounded-full bg-border" style={{ marginTop: 44, marginBottom: 16 }}>
          {/* Retirement anchor */}
          <div
            className="absolute -top-10 bottom-[-0.75rem] z-10 w-px bg-primary/40"
            style={{ left: `${leftPct(retYearShown)}%` }}
          />
          <button
            type="button"
            onPointerDown={startRetireDrag}
            aria-label={`${t("lifeEvents.retirement")} ${retYearShown}`}
            className="absolute -top-10 z-20 -translate-x-1/2 cursor-grab touch-none rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-primary-foreground shadow-sm active:cursor-grabbing"
            style={{ left: `${leftPct(retYearShown)}%` }}
          >
            {t("lifeEvents.retirement")} · {retYearShown}
          </button>

          {/* Event chips */}
          {events.map((item) => {
            const preset = lifeEventPreset(item.presetKey);
            const Icon = preset.icon;
            const year = drag?.kind === "event" && drag.id === item.id ? drag.year : item.year;
            return (
              <div
                key={item.id}
                className="absolute top-1 z-10 -translate-x-1/2"
                style={{ left: `${leftPct(year)}%` }}
              >
                <span className="mx-auto block h-3 w-px bg-border" />
                <button
                  type="button"
                  onPointerDown={(e) => startEventDrag(e, item)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") nudge(item, e.shiftKey ? -5 : -1);
                    else if (e.key === "ArrowRight") nudge(item, e.shiftKey ? 5 : 1);
                    else if (e.key === "Enter" || e.key === " ") setEditId((c) => (c === item.id ? null : item.id));
                    else if (e.key === "Delete" || e.key === "Backspace") removeLifeEvent(item.id);
                  }}
                  role="slider"
                  aria-valuemin={thisYear}
                  aria-valuemax={retirementYear}
                  aria-valuenow={year}
                  aria-label={`${item.label || t(`lifeEvents.preset.${item.presetKey}`)} ${year}`}
                  className={cn(
                    "flex cursor-grab touch-none items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium whitespace-nowrap shadow-sm ring-1 ring-border/50 outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
                    preset.color,
                    editId === item.id && "ring-2 ring-ring",
                  )}
                >
                  <Icon className="size-3" />
                  <span className="max-w-24 truncate">{item.label || t(`lifeEvents.preset.${item.presetKey}`)}</span>
                  <span className="tabular-nums opacity-70">· {year}</span>
                </button>
              </div>
            );
          })}

          <span className="absolute top-2 left-0 text-[10px] text-muted-foreground">{minYear}</span>
          <span className="absolute top-2 right-0 text-[10px] text-muted-foreground">{maxYear}</span>
        </div>
      </div>

      {/* Inline editor for the selected event */}
      {editing && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <Input
            value={editing.label ?? ""}
            placeholder={t(`lifeEvents.preset.${editing.presetKey}`)}
            onChange={(e) => updateLifeEvent(editing.id, { label: e.target.value || undefined })}
            className="h-8 min-w-32 flex-1"
          />
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            {t("lifeEvents.year")}
            <Input
              type="number"
              min={thisYear}
              max={retirementYear}
              value={editing.year}
              onChange={(e) =>
                updateLifeEvent(editing.id, { year: clampEventYear(e.target.valueAsNumber || editing.year) })
              }
              className="h-8 w-20 tabular-nums"
            />
          </label>
          <MoneyInput
            value={editing.amount}
            onChange={(n) => updateLifeEvent(editing.id, { amount: n })}
            className="h-8 w-32"
          />
          <div className="flex rounded-full border border-border p-0.5 text-xs">
            {(["outflow", "inflow"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => updateLifeEvent(editing.id, { kind: k })}
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium transition-colors",
                  editing.kind === k
                    ? k === "inflow"
                      ? "bg-positive-muted text-positive"
                      : "bg-negative/10 text-negative"
                    : "text-muted-foreground",
                )}
              >
                {t(`lifeEvents.${k}`)}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              removeLifeEvent(editing.id);
              setEditId(null);
            }}
          >
            <Trash2 className="size-4" />
            {t("lifeEvents.remove")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Preset palette — click to drop an event, then drag it on the timeline */}
      <div>
        <div className="mb-1.5 text-[11px] tracking-wide text-muted-foreground/80 uppercase">
          {t("lifeEvents.palette")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LIFE_EVENT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => addPreset(preset.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span className={cn("grid size-4 place-items-center rounded-full", preset.color)}>
                  <Icon className="size-2.5" />
                </span>
                {t(`lifeEvents.preset.${preset.key}`)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => addPreset(CUSTOM_PRESET.key)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t("lifeEvents.preset.custom")}
          </button>
        </div>
      </div>
    </div>
  );
}
