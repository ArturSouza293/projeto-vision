"use client";

/**
 * v6 — Linha do tempo financeira (redesign, referência: timeline_vision.jsx).
 *
 * Faixa única com empacotamento em LANES (zero sobreposição de labels, com
 * reorganização ao vivo durante o arraste), chips ricos (ícone temático +
 * nome + ano + seta de direção), marco vermelho Bradesco arrastável
 * (Aposentadoria — continua sendo a âncora REAL: clamps retMin/retMax e
 * propagação preservados), conectores SVG até o eixo, régua adaptativa
 * (passo 1/2/5/10) e scroll horizontal honesto (MIN_PX_PER_YEAR).
 *
 * REGRA ZERO: o JSX de referência é UI; todos os números continuam vindo do
 * motor — o drag agenda o ghost por rAF exatamente como antes (60fps, <5ms).
 * VIS-607 habilitado: o horizonte vai até a longevidade do caso e eventos
 * podem viver na fase de usufruto (o motor já projeta ambas as fases).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDot,
  Flag,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "@/components/app/icons";
import { MoneyInput } from "@/components/app/number-field";
import { WealthArea } from "@/components/charts/wealth-area";
import { CustomEventModal } from "@/components/engine/custom-event-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LIFE_EVENT_PRESETS, lifeEventPreset } from "@/lib/life-event-meta";
import { formatCurrency } from "@/lib/format";
import { projecaoDesejavel } from "@/lib/next-step";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { LifeEvent, Plan, ProjectionPoint, ScenarioAssumptions } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ---- tokens visuais da FAIXA (spec v6 §A.11 — escopo: este componente) ---- */
const T = {
  ink: "#14181F",
  muted: "#5B6472",
  faint: "#8A93A2",
  hairline: "#E7EAF0",
  surface: "#F7F8FA",
  red: "#CC092F",
  redFill: "#FCE8EC",
  in: "#0B7A57",
  inFill: "#E4F4EC",
  out: "#B45816",
  outFill: "#FBEDE2",
};

/** Preparado para um futuro kind "goal" (VIS-605) — extensibilidade apenas. */
function colorFor(kind: "milestone" | "inflow" | "outflow" | "goal") {
  if (kind === "milestone") return { main: T.red, fill: T.redFill };
  if (kind === "inflow") return { main: T.in, fill: T.inFill };
  if (kind === "goal") return { main: T.red, fill: T.redFill };
  return { main: T.out, fill: T.outFill };
}

const MIN_PX_PER_YEAR = 16;
const PAD_L = 28;
const PAD_R = 28;
const CHIP_H = 32;
const LANE_GAP = 10;
const LANE_STEP = CHIP_H + LANE_GAP;
const TOP_PAD = 38;
const RULER_GAP = 26;
const LANE_PACK_GAP = 14;

const clampNum = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const estimateW = (name: string, year: number) =>
  Math.max(132, Math.round(60 + `${name} · ${year}`.length * 7.4));

const CHIP_TRANSITION =
  "transition-[top,box-shadow] duration-[180ms] ease-[cubic-bezier(.2,.7,.3,1)] motion-reduce:transition-none";

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
  const locale = useVisionStore((s) => s.locale);
  const addLifeEvent = useVisionStore((s) => s.addLifeEvent);
  const updateLifeEvent = useVisionStore((s) => s.updateLifeEvent);
  const removeLifeEvent = useVisionStore((s) => s.removeLifeEvent);
  const updateScenarioAssumptions = useVisionStore((s) => s.updateScenarioAssumptions);

  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startYear: number; moved: boolean } | null>(null);
  const [width, setWidth] = useState(0);
  const [ghost, setGhost] = useState<ProjectionPoint[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editId, setEditId] = useState<string | null>(null); // event id ou "retire"
  const [customOpen, setCustomOpen] = useState(false);
  // C10 — sobreposição "real × desejável" (motor; só existe se há lacuna a fechar).
  const [showIdeal, setShowIdeal] = useState(false);
  const desejavel = useMemo(
    () => projecaoDesejavel(plan, assumptions),
    [plan, assumptions],
  );

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const thisYear = new Date().getFullYear();
  // Horizonte derivado do CASO: hoje → longevidade da projeção (VIS-607).
  const minYear = points[0]?.year ?? thisYear;
  const maxYear = points[points.length - 1]?.year ?? thisYear + 1;
  const events = plan.lifeEvents ?? [];

  const avail = width || 920;
  const needed = (maxYear - minYear) * MIN_PX_PER_YEAR + PAD_L + PAD_R;
  const innerW = Math.max(avail, needed);
  const usableW = innerW - PAD_L - PAD_R;
  const pxPerYear = usableW / Math.max(1, maxYear - minYear);
  const xOf = useCallback(
    (y: number) => PAD_L + ((y - minYear) / Math.max(1, maxYear - minYear)) * usableW,
    [minYear, maxYear, usableW],
  );

  const clampEventYear = (y: number) => clampNum(y, thisYear, maxYear);
  const clampRetAge = (a: number) => clampNum(a, retMin, retMax);
  const retYearShown = drag?.kind === "retire" ? drag.year : retirementYear;

  /* ---------- ghost (Regra Zero: recálculo do motor por rAF, como antes) ---------- */
  function scheduleGhost(modPlan: Plan, a: ScenarioAssumptions) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setGhost(projectPlan(modPlan, a).points));
  }

  /* ---------- layout: empacotamento em lanes (reorganiza AO VIVO no drag) ---------- */
  const layout = useMemo(() => {
    const enriched = events
      .map((ev) => {
        const year = drag?.kind === "event" && drag.id === ev.id ? drag.year : ev.year;
        const label = ev.label || t(`lifeEvents.preset.${ev.presetKey}`);
        const w = estimateW(label, year);
        const cx = xOf(year);
        const left = clampNum(cx - w / 2, 4, innerW - w - 4);
        return { ev, year, label, w, cx, left, lane: 0, top: 0 };
      })
      .sort((a, b) => a.left - b.left);

    const laneEnds: number[] = [];
    for (const item of enriched) {
      let lane = laneEnds.findIndex((end) => end <= item.left - LANE_PACK_GAP);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.left + item.w);
      } else {
        laneEnds[lane] = item.left + item.w;
      }
      item.lane = lane;
    }
    const nLanes = Math.max(1, laneEnds.length);
    const axisY = TOP_PAD + 12 + CHIP_H + (nLanes - 1) * LANE_STEP;
    for (const item of enriched) item.top = axisY - 12 - CHIP_H - item.lane * LANE_STEP;

    return { items: enriched, axisY, height: axisY + RULER_GAP + 22 };
  }, [events, drag, xOf, innerW, t]);

  /* ---------- régua adaptativa ---------- */
  const ticks = useMemo(() => {
    const step = [1, 2, 5, 10].find((s) => s * pxPerYear >= 46) ?? 10;
    const start = Math.ceil(minYear / step) * step;
    const out: number[] = [];
    for (let y = start; y <= maxYear; y += step) out.push(y);
    return out;
  }, [pxPerYear, minYear, maxYear]);

  /* ---------- drag (pointer capture, snap por ano, tap ≤4px = selecionar) ---------- */
  function yearFromDx(startYear: number, dx: number) {
    return Math.round(startYear + dx / pxPerYear);
  }

  function onEventPointerDown(e: React.PointerEvent, ev: LifeEvent) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: ev.id, startX: e.clientX, startYear: ev.year, moved: false };
    setDrag({ kind: "event", id: ev.id, year: ev.year });
  }
  function onEventPointerMove(e: React.PointerEvent, ev: LifeEvent) {
    const d = dragRef.current;
    if (!d || d.id !== ev.id) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 8) d.moved = true;
    const year = clampEventYear(yearFromDx(d.startYear, dx));
    setDrag({ kind: "event", id: ev.id, year });
    scheduleGhost(
      { ...plan, lifeEvents: events.map((x) => (x.id === ev.id ? { ...x, year } : x)) },
      assumptions,
    );
  }
  function onEventPointerUp(e: React.PointerEvent, ev: LifeEvent) {
    const d = dragRef.current;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    setDrag(null);
    setGhost(null);
    if (!d) return;
    if (d.moved) {
      const year = clampEventYear(yearFromDx(d.startYear, e.clientX - d.startX));
      updateLifeEvent(ev.id, { year });
    } else {
      setEditId((cur) => (cur === ev.id ? null : ev.id)); // tap = selecionar/editar
    }
  }

  function onRetirePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: "retire", startX: e.clientX, startYear: retirementYear, moved: false };
    setDrag({ kind: "retire", year: retirementYear });
  }
  function onRetirePointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || d.id !== "retire") return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 8) d.moved = true;
    const age = clampRetAge(currentAge + (yearFromDx(d.startYear, dx) - thisYear));
    setDrag({ kind: "retire", year: thisYear + (age - currentAge) });
    scheduleGhost(plan, { ...assumptions, retirementAge: age, growthScenario: "custom" });
  }
  function onRetirePointerUp(e: React.PointerEvent) {
    const d = dragRef.current;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    setDrag(null);
    setGhost(null);
    if (!d) return;
    if (d.moved) {
      // Âncora REAL (VIS-604): commit recalcula tudo; um tap não força custom.
      const age = clampRetAge(currentAge + (yearFromDx(d.startYear, e.clientX - d.startX) - thisYear));
      updateScenarioAssumptions(scenarioId, { retirementAge: age, growthScenario: "custom" });
    } else {
      setEditId((cur) => (cur === "retire" ? null : "retire"));
    }
  }

  function onKeyNudge(e: React.KeyboardEvent, ev: LifeEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 5 : 1);
      updateLifeEvent(ev.id, { year: clampEventYear(ev.year + step) });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setEditId((c) => (c === ev.id ? null : ev.id));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      removeLifeEvent(ev.id);
    }
  }
  function onRetireKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const step = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 5 : 1);
      updateScenarioAssumptions(scenarioId, {
        retirementAge: clampRetAge(assumptions.retirementAge + step),
        growthScenario: "custom",
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setEditId((c) => (c === "retire" ? null : "retire"));
    }
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

  const editing = editId && editId !== "retire" ? events.find((e) => e.id === editId) : undefined;
  const cur = (n: number) => formatCurrency(n, locale);
  const retW = estimateW(t("lifeEvents.retirement"), retYearShown);
  const retCx = xOf(retYearShown);
  const retLeft = clampNum(retCx - retW / 2, 4, innerW - retW - 4);

  return (
    <div className="space-y-3">
      {desejavel && (
        <label className="flex cursor-pointer items-center justify-end gap-2 px-1 text-xs text-muted-foreground">
          <span>{t("scenarios.chart.toggleDesejavel")}</span>
          <Switch checked={showIdeal} onCheckedChange={setShowIdeal} />
        </label>
      )}
      <WealthArea
        points={points}
        retirementYear={retirementYear}
        ghostPoints={ghost}
        desejavelPoints={showIdeal ? desejavel : null}
      />

      {/* ---------------- faixa da linha do tempo (v6) ---------------- */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: T.hairline, boxShadow: "0 1px 2px rgba(20,24,31,.04)" }}
      >
        {/* cabeçalho */}
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4 pb-3.5">
          <div>
            <div
              className="text-[11px] font-semibold tracking-[0.14em] uppercase"
              style={{ color: T.faint }}
            >
              {t("timeline.planTitle")}
            </div>
            <h3 className="font-heading mt-0.5 text-lg leading-tight font-semibold" style={{ color: T.ink }}>
              {t("timeline.title")}
            </h3>
            <p className="mt-1 text-xs" style={{ color: T.muted }}>
              {t("timeline.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div
              className="hidden flex-wrap items-center gap-2 text-xs font-semibold sm:flex sm:gap-3"
              style={{ color: T.muted }}
            >
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-2 rounded-full" style={{ background: T.in }} />
                {t("lifeEvents.inflow")}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-2 rounded-full" style={{ background: T.out }} />
                {t("lifeEvents.outflow")}
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-2 rounded-full" style={{ background: T.red }} />
                {t("timeline.legendMilestone")}
              </span>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => setCustomOpen(true)}>
              <Plus className="size-4" />
              {t("timeline.addEvent")}
            </Button>
          </div>
        </div>

        {/* faixa (scroll horizontal honesto quando o horizonte não cabe) */}
        <div
          ref={wrapRef}
          data-testid="timeline-track"
          className="overflow-x-auto"
          style={{ background: T.surface, borderTop: `1px solid ${T.hairline}` }}
        >
          <div className="relative my-2" style={{ width: innerW, height: layout.height }}>
            {/* linhas / pontos / conectores */}
            <svg width={innerW} height={layout.height} className="absolute inset-0 block">
              <line x1={PAD_L} y1={layout.axisY} x2={innerW - PAD_R} y2={layout.axisY} stroke={T.hairline} strokeWidth={2} />
              {/* hoje */}
              <line x1={xOf(minYear)} y1={layout.axisY - 5} x2={xOf(minYear)} y2={layout.axisY + 5} stroke={T.faint} strokeWidth={2} />
              {ticks.map((y) => (
                <g key={y}>
                  <line x1={xOf(y)} y1={layout.axisY} x2={xOf(y)} y2={layout.axisY + 6} stroke={T.hairline} strokeWidth={1.5} />
                  <text x={xOf(y)} y={layout.axisY + RULER_GAP} textAnchor="middle" fontSize="12" fontWeight="600" fill={T.faint}>
                    {y}
                  </text>
                </g>
              ))}
              {/* guia do marco */}
              <line x1={retCx} y1={26} x2={retCx} y2={layout.axisY} stroke={T.red} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.6} />
              {/* conectores + pontos */}
              {layout.items.map(({ ev, cx, top }) => {
                const c = colorFor(ev.kind);
                const sel = editId === ev.id;
                return (
                  <g key={ev.id}>
                    <line x1={cx} y1={top + CHIP_H} x2={cx} y2={layout.axisY} stroke={c.main} strokeWidth={1.25} opacity={sel ? 0.9 : 0.4} />
                    <circle cx={cx} cy={layout.axisY} r={sel ? 5 : 4} fill={c.main} stroke="#fff" strokeWidth={2} />
                  </g>
                );
              })}
            </svg>

            {/* marco: Aposentadoria (âncora real, arrastável) */}
            <div
              role="button"
              tabIndex={0}
              data-testid="timeline-retire"
              aria-label={`${t("timeline.legendMilestone")} ${t("lifeEvents.retirement")}, ${retYearShown}`}
              onPointerDown={onRetirePointerDown}
              onPointerMove={onRetirePointerMove}
              onPointerUp={onRetirePointerUp}
              onKeyDown={onRetireKey}
              className={cn(
                "absolute flex items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap text-white select-none focus-visible:outline-2 focus-visible:outline-offset-2",
                "before:absolute before:-inset-y-2 before:content-['']",
                CHIP_TRANSITION,
                drag?.kind === "retire" ? "cursor-grabbing" : "cursor-grab",
              )}
              style={{
                top: 2,
                left: retLeft,
                height: 26,
                background: T.red,
                touchAction: "none",
                boxShadow: editId === "retire" ? `0 0 0 3px ${T.redFill}` : "0 1px 2px rgba(20,24,31,.12)",
                zIndex: drag?.kind === "retire" ? 40 : 20,
              }}
            >
              <Flag className="size-3.5" /> {t("lifeEvents.retirement")} · {retYearShown}
            </div>

            {/* eventos (chips ricos em lanes) */}
            {layout.items.map(({ ev, year, label, top, left }) => {
              const preset = lifeEventPreset(ev.presetKey);
              const Icon = preset.icon ?? CircleDot;
              const c = colorFor(ev.kind);
              const sel = editId === ev.id;
              const dragging = drag?.kind === "event" && drag.id === ev.id;
              return (
                <div
                  key={ev.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`timeline-event-${ev.presetKey}`}
                  aria-label={`${label}, ${t(`lifeEvents.${ev.kind}`)} ${cur(ev.amount)}, ${year}. ${t("timeline.subtitle")}`}
                  onPointerDown={(e) => onEventPointerDown(e, ev)}
                  onPointerMove={(e) => onEventPointerMove(e, ev)}
                  onPointerUp={(e) => onEventPointerUp(e, ev)}
                  onKeyDown={(e) => onKeyNudge(e, ev)}
                  className={cn(
                    "absolute flex items-center gap-2 rounded-[10px] border bg-white px-2.5 whitespace-nowrap select-none hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2",
                    "before:absolute before:-inset-y-2 before:content-['']",
                    CHIP_TRANSITION,
                    dragging ? "cursor-grabbing" : "cursor-grab",
                  )}
                  style={{
                    top,
                    left,
                    height: CHIP_H,
                    borderColor: sel ? c.main : T.hairline,
                    boxShadow: sel
                      ? `0 0 0 3px ${c.fill}, 0 4px 10px rgba(20,24,31,.10)`
                      : "0 1px 2px rgba(20,24,31,.06)",
                    touchAction: "none",
                    zIndex: dragging ? 40 : sel ? 30 : 10,
                  }}
                >
                  <span
                    className="flex size-[22px] shrink-0 items-center justify-center rounded-md"
                    style={{ background: c.fill, color: c.main }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="max-w-36 truncate text-[13px] font-semibold" style={{ color: T.ink }}>
                    {label}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: T.faint }}>
                    · {year}
                  </span>
                  {ev.kind === "inflow" ? (
                    <ArrowDownLeft className="size-3.5" style={{ color: c.main }} />
                  ) : (
                    <ArrowUpRight className="size-3.5" style={{ color: c.main }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* painel de edição inline */}
        {(editing || editId === "retire") && (
          <div className="border-t bg-white px-5 py-4" style={{ borderColor: T.hairline }}>
            <div className="mb-3.5 flex items-center justify-between">
              <div
                className="flex items-center gap-2 text-xs font-bold"
                style={{ color: editing ? colorFor(editing.kind).main : T.red }}
              >
                <span
                  className="flex size-[22px] items-center justify-center rounded-md"
                  style={{ background: editing ? colorFor(editing.kind).fill : T.redFill }}
                >
                  {editing ? <GripVertical className="size-3.5" /> : <Flag className="size-3.5" />}
                </span>
                {editing ? t("timeline.editEvent") : t("timeline.editMilestone")}
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                data-testid="event-editor-close"
                aria-label={t("common.close")}
                onClick={() => setEditId(null)}
              >
                <X className="size-4" />
              </Button>
            </div>

            {editing ? (
              <EventFields
                ev={editing}
                minYear={thisYear}
                maxYear={maxYear}
                cur={cur}
                onChange={(patch) => updateLifeEvent(editing.id, patch)}
                onRemove={() => {
                  removeLifeEvent(editing.id);
                  setEditId(null);
                }}
              />
            ) : (
              <RetireFields
                age={Math.min(Math.max(assumptions.retirementAge, retMin), retMax)}
                retMin={retMin}
                retMax={retMax}
                year={retirementYear}
                onChange={(age) =>
                  updateScenarioAssumptions(scenarioId, {
                    retirementAge: clampRetAge(age),
                    growthScenario: "custom",
                  })
                }
              />
            )}
          </div>
        )}
      </div>

      {/* paleta de presets (atalho de 1 clique — mantida do v2/v5) */}
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
                data-testid={`palette-${preset.key}`}
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
            data-testid="palette-custom"
            onClick={() => setCustomOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-3.5" />
            {t("lifeEvents.preset.custom")}
          </button>
        </div>
      </div>

      <CustomEventModal plan={plan} open={customOpen} onOpenChange={setCustomOpen} maxYear={maxYear} />
    </div>
  );
}

/* ------------------------- campos do painel: evento ------------------------- */
function EventFields({
  ev,
  minYear,
  maxYear,
  cur,
  onChange,
  onRemove,
}: {
  ev: LifeEvent;
  minYear: number;
  maxYear: number;
  cur: (n: number) => string;
  onChange: (patch: Partial<LifeEvent>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations();
  const c = colorFor(ev.kind);
  const duracao = ev.recurring && ev.endYear ? Math.max(1, ev.endYear - ev.year + 1) : 1;
  const label = "mb-1.5 block text-[11px] font-bold tracking-[0.06em] uppercase";

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-48 flex-[2_1_200px]">
        <span className={label} style={{ color: T.faint }}>{t("eventForm.name")}</span>
        <Input
          value={ev.label ?? ""}
          placeholder={t(`lifeEvents.preset.${ev.presetKey}`)}
          onChange={(e) => onChange({ label: e.target.value || undefined })}
          className="h-9"
        />
      </div>

      <div className="min-w-40 flex-[1_1_170px]">
        <span className={label} style={{ color: T.faint }}>{t("eventForm.flow")}</span>
        <div className="flex overflow-hidden rounded-[9px] border" style={{ borderColor: T.hairline }}>
          {(["outflow", "inflow"] as const).map((k, i) => {
            const kc = colorFor(k);
            const active = ev.kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ kind: k })}
                className="flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[13px] font-bold"
                style={{
                  background: active ? kc.main : "#fff",
                  color: active ? "#fff" : T.muted,
                  borderLeft: i ? `1px solid ${T.hairline}` : "none",
                }}
              >
                {k === "inflow" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                {t(`lifeEvents.${k}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-36 flex-[1_1_150px]">
        <span className={label} style={{ color: T.faint }}>{t("eventForm.amount")}</span>
        <MoneyInput value={ev.amount} onChange={(n) => onChange({ amount: n })} className="h-9 w-full" />
      </div>

      {/* duração/recorrência — campos do protótipo preservados (spec §A adaptar 6) */}
      <div className="flex items-center gap-2 pb-1">
        <Switch
          id="tl-rec"
          checked={!!ev.recurring}
          onCheckedChange={(v) =>
            onChange(v ? { recurring: true, endYear: ev.endYear ?? ev.year + 2 } : { recurring: undefined, endYear: undefined })
          }
        />
        <label htmlFor="tl-rec" className="text-xs" style={{ color: T.muted }}>
          {t("eventForm.recurring")}
        </label>
      </div>
      {ev.recurring && (
        <div className="w-24">
          <span className={label} style={{ color: T.faint }}>{t("eventForm.duration")}</span>
          <Input
            type="number"
            min={1}
            max={maxYear - ev.year + 1}
            value={duracao}
            onChange={(e) =>
              onChange({ endYear: ev.year + Math.max(1, e.target.valueAsNumber || 1) - 1 })
            }
            className="h-9 tabular-nums"
          />
        </div>
      )}

      <div className="min-w-0 flex-[2_1_220px] sm:min-w-52">
        <span className={label} style={{ color: T.faint }}>
          {t("eventForm.year")} — <b style={{ color: T.ink }}>{ev.year}</b>
        </span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={ev.year}
            onChange={(e) => onChange({ year: Number(e.target.value) })}
            className="w-full"
            style={{ accentColor: c.main }}
            aria-label={t("eventForm.year")}
          />
          <Input
            type="number"
            min={minYear}
            max={maxYear}
            value={ev.year}
            onChange={(e) => onChange({ year: clampNum(e.target.valueAsNumber || ev.year, minYear, maxYear) })}
            className="h-9 w-20 text-center font-bold tabular-nums"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="font-bold"
        style={{ background: T.redFill, color: T.red }}
      >
        <Trash2 className="size-4" />
        {t("lifeEvents.remove")}
      </Button>
      <span className="sr-only">{cur(ev.amount)}</span>
    </div>
  );
}

/* ---------------------- campos do painel: marco (aposentadoria) ---------------------- */
function RetireFields({
  age,
  retMin,
  retMax,
  year,
  onChange,
}: {
  age: number;
  retMin: number;
  retMax: number;
  year: number;
  onChange: (age: number) => void;
}) {
  const t = useTranslations();
  const label = "mb-1.5 block text-[11px] font-bold tracking-[0.06em] uppercase";
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0 flex-[2_1_260px] sm:min-w-64">
        <span className={label} style={{ color: T.faint }}>
          {t("workspace.retirementAge")} — <b style={{ color: T.ink }}>{age}</b> · {year}
        </span>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={retMin}
            max={retMax}
            value={age}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: T.red }}
            aria-label={t("workspace.retirementAge")}
          />
          <Input
            type="number"
            min={retMin}
            max={retMax}
            value={age}
            onChange={(e) => onChange(e.target.valueAsNumber || age)}
            className="h-9 w-20 text-center font-bold tabular-nums"
          />
        </div>
      </div>
      <p className="pb-1 text-xs" style={{ color: T.muted }}>
        {t("timeline.milestoneHint")}
      </p>
    </div>
  );
}
