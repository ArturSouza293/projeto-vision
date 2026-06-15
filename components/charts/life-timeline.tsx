"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Plus, X } from "@/components/app/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ageFromDob } from "@/lib/calc";
import { useVisionStore } from "@/lib/store/plan-store";
import type { AdvisorEventType } from "@/lib/types";

const EVENT_TYPES: AdvisorEventType[] = [
  "review",
  "contribution",
  "rebalancing",
  "meeting",
  "other",
];

/**
 * Interactive life-goals timeline: goal deadlines (above the axis) + scheduled
 * life events (below), a retirement marker, and click-to-add anywhere on the
 * track. Reads goals/events from the active plan and writes via addEvent.
 */
export function LifeTimeline() {
  const t = useTranslations();
  const plan = useVisionStore((s) => s.activePlan);
  const addEvent = useVisionStore((s) => s.addEvent);
  const removeEvent = useVisionStore((s) => s.removeEvent);

  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftType, setDraftType] = useState<AdvisorEventType>("review");

  if (!plan) return null;

  const thisYear = new Date().getFullYear();
  const age = ageFromDob(plan.clientProfile.dateOfBirth);
  const usufruct = plan.clientProfile.retirementUsufructAge ?? (age >= 60 ? age + 5 : 65);
  const retirementYear = thisYear + Math.max(1, usufruct - age);

  const eventYear = (iso: string) => new Date(iso).getFullYear();
  const goalYears = plan.goals.map((g) => g.targetYear);
  const eventYears = plan.events.map((e) => eventYear(e.date));
  const maxYear = Math.max(retirementYear, thisYear + 1, ...goalYears, ...eventYears) + 1;
  const minYear = thisYear;
  const span = Math.max(1, maxYear - minYear);
  const pct = (y: number) => Math.max(0, Math.min(100, ((y - minYear) / span) * 100));

  function handleTrackClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setDraftYear(Math.round(minYear + x * span));
    setDraftTitle("");
  }

  function confirmAdd() {
    if (draftYear == null) return;
    addEvent({
      title: draftTitle.trim() || t("timeline.newEvent"),
      date: `${draftYear}-06-01`,
      type: draftType,
    });
    setDraftYear(null);
    setDraftTitle("");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("timeline.title")}</h3>
        <span className="text-xs text-muted-foreground">{t("timeline.hint")}</span>
      </div>

      {/* Mobile: vertical stacked list (no overlay collisions on phones) */}
      <ul className="flex flex-col gap-2 md:hidden">
        <li className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          <span className="size-2 shrink-0 rounded-full bg-primary/60" />
          <span className="min-w-0 truncate">
            {t("timeline.retirement")} · {retirementYear}
          </span>
        </li>
        {plan.goals.map((g) => (
          <li
            key={g.id}
            className="flex items-center gap-2 rounded-full bg-info/15 px-3 py-1.5 text-xs font-medium text-info"
          >
            <span className="size-2 shrink-0 rounded-full bg-info" />
            <span className="min-w-0 truncate">
              {g.label || t(`goalType.${g.type}`)} · {g.targetYear}
            </span>
          </li>
        ))}
        {plan.events.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-foreground"
          >
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="min-w-0 flex-1 truncate">
              {e.title} · {eventYear(e.date)}
            </span>
            <button
              type="button"
              aria-label={t("common.remove")}
              onClick={() => removeEvent(e.id)}
              style={{ touchAction: "manipulation" }}
              className="-m-1 inline-flex size-7 shrink-0 items-center justify-center p-1 text-muted-foreground transition-colors hover:text-negative"
            >
              <X className="size-2.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Desktop: absolute horizontal track (≥md keeps the original layout) */}
      <div className="relative mx-2 mt-12 mb-12 hidden h-0.5 rounded-full bg-border md:block">
        {/* Retirement marker */}
        <div
          className="absolute -top-9 bottom-[-2.5rem] w-px bg-primary/40"
          style={{ left: `${pct(retirementYear)}%` }}
        />
        <span
          className="absolute -top-9 -translate-x-1/2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-primary"
          style={{ left: `${pct(retirementYear)}%` }}
        >
          {t("timeline.retirement")} · {retirementYear}
        </span>

        {/* Goal deadlines (above) */}
        {plan.goals.map((g) => (
          <div
            key={g.id}
            className="absolute -top-5 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pct(g.targetYear)}%` }}
          >
            <span className="rounded-full bg-info/15 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-info">
              {g.label || t(`goalType.${g.type}`)} · {g.targetYear}
            </span>
            <span className="mt-1 size-2 rounded-full bg-info ring-2 ring-card" />
          </div>
        ))}

        {/* Scheduled events (below) */}
        {plan.events.map((e) => (
          <div
            key={e.id}
            className="absolute top-1 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${pct(eventYear(e.date))}%` }}
          >
            <span className="size-2 rounded-full bg-primary ring-2 ring-card" />
            <span className="mt-1 flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] whitespace-nowrap text-foreground">
              {e.title} · {eventYear(e.date)}
              <button
                type="button"
                aria-label={t("common.remove")}
                onClick={() => removeEvent(e.id)}
                style={{ touchAction: "manipulation" }}
                className="-m-1 inline-flex size-7 items-center justify-center p-1 text-muted-foreground transition-colors hover:text-negative"
              >
                <X className="size-2.5" />
              </button>
            </span>
          </div>
        ))}

        {/* Click-to-add overlay */}
        <button
          type="button"
          onClick={handleTrackClick}
          aria-label={t("timeline.add")}
          className="absolute inset-x-0 -top-2 h-5 cursor-copy rounded-full"
        />

        {/* Axis bounds */}
        <span className="absolute top-3 left-0 text-[10px] text-muted-foreground">{minYear}</span>
        <span className="absolute top-3 right-0 text-[10px] text-muted-foreground">{maxYear}</span>
      </div>

      {draftYear != null && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">
            {draftYear}
          </span>
          <Input
            value={draftTitle}
            placeholder={t("timeline.eventTitle")}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmAdd();
            }}
            className="h-8 min-w-0 flex-1"
          />
          <Select value={draftType} onValueChange={(v) => setDraftType(v as AdvisorEventType)}>
            <SelectTrigger className="h-8 w-36 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((ty) => (
                <SelectItem key={ty} value={ty}>
                  {t(`eventType.${ty}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={confirmAdd}>
            <Plus className="size-4" />
            {t("timeline.add")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraftYear(null)}>
            {t("timeline.cancel")}
          </Button>
        </div>
      )}
    </section>
  );
}
