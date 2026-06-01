"use client";

import { useTranslations } from "next-intl";
import { Sparkles, TriangleAlert } from "lucide-react";

import { StepHeader } from "@/components/journey/step-header";
import { Button } from "@/components/ui/button";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { SUITABILITY_QUESTIONS } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import { cn } from "@/lib/utils";

export function SuitabilityStep() {
  const t = useTranslations();
  const suitability = useVisionStore((s) => s.activePlan!.suitability);
  const setSuitabilityAnswer = useVisionStore((s) => s.setSuitabilityAnswer);
  const runSuitability = useVisionStore((s) => s.runSuitability);
  const busy = useVisionStore((s) => s.busy);

  const allAnswered = SUITABILITY_QUESTIONS.every(
    (q) => suitability.answers[q.id] !== undefined,
  );
  const profile = suitability.profile;
  const score = suitability.score ?? 0;

  return (
    <div>
      <StepHeader title={t("suitability.title")} subtitle={t("suitability.subtitle")} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {SUITABILITY_QUESTIONS.map((q, i) => (
            <section key={q.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-sm font-medium text-foreground">{t(q.promptKey)}</h3>
              </div>
              <RadioGroup
                value={
                  suitability.answers[q.id] !== undefined
                    ? String(suitability.answers[q.id])
                    : undefined
                }
                onValueChange={(v) => setSuitabilityAnswer(q.id, Number(v))}
                className="grid gap-2 sm:grid-cols-2"
              >
                {q.options.map((o) => {
                  const selected = suitability.answers[q.id] === o.value;
                  return (
                    <label
                      key={o.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <RadioGroupItem value={String(o.value)} />
                      {t(o.labelKey)}
                    </label>
                  );
                })}
              </RadioGroup>
            </section>
          ))}
        </div>

        <aside>
          <div className="sticky top-32 rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("suitability.result")}
            </div>

            {profile ? (
              <>
                <div className="mt-1 font-heading text-3xl font-semibold text-primary">
                  {t(`riskProfile.${profile}`)}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t("suitability.score")}:{" "}
                  <span className="font-medium text-foreground tabular-nums">{score}</span>/100
                </div>

                <div className="mt-4">
                  <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="absolute inset-0 flex">
                      <div className="h-full" style={{ width: "34%", background: "var(--info)", opacity: 0.25 }} />
                      <div className="h-full" style={{ width: "33%", background: "var(--warning)", opacity: 0.25 }} />
                      <div className="h-full" style={{ width: "33%", background: "var(--positive)", opacity: 0.25 }} />
                    </div>
                    <div
                      className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow"
                      style={{ left: `${score}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                    <span>{t("riskProfile.conservative")}</span>
                    <span>{t("riskProfile.moderate")}</span>
                    <span>{t("riskProfile.aggressive")}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("suitability.flagsTitle")}
                  </div>
                  {suitability.flags.length > 0 ? (
                    <ul className="space-y-2">
                      {suitability.flags.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-warning">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                          <span>{t(f)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("suitability.noFlags")}</p>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="mt-5 w-full"
                  disabled={busy || !allAnswered}
                  onClick={runSuitability}
                >
                  <Sparkles className="size-4" />
                  {t("suitability.recompute")}
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("suitability.answerAll")}
                </p>
                <Button
                  className="mt-4 w-full"
                  disabled={busy || !allAnswered}
                  onClick={runSuitability}
                >
                  <Sparkles className="size-4" />
                  {t("suitability.compute")}
                </Button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
