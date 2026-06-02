"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  CircleCheckBig,
  Code2,
  CreditCard,
  Gem,
  Globe,
  RotateCcw,
  Send,
  ShieldCheck,
  Sunset,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Money } from "@/components/app/money";
import { Button } from "@/components/ui/button";
import { generateOpportunities } from "@/lib/cross-sell";
import { formatDate } from "@/lib/format";
import { buildOutputPayload } from "@/lib/output";
import { projectPlan } from "@/lib/plan";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Fit } from "@/lib/types";
import { cn } from "@/lib/utils";

const CAT_ICON: Record<string, LucideIcon> = {
  credit: CreditCard,
  protection: ShieldCheck,
  reserve: Wallet,
  investments: TrendingUp,
  retirement: Sunset,
  goals: Target,
  international: Globe,
  wealth: Gem,
};

const FIT_STYLE: Record<Fit, string> = {
  high: "bg-positive-muted text-positive",
  medium: "bg-info-muted text-info",
  low: "bg-muted text-muted-foreground",
};

export function Output() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const plan = useVisionStore((s) => s.activePlan!);
  const approvePlan = useVisionStore((s) => s.approvePlan);
  const reopenPlan = useVisionStore((s) => s.reopenPlan);
  const sendToSalesforce = useVisionStore((s) => s.sendToSalesforce);
  const outbound = useVisionStore((s) => s.outbound);
  const busy = useVisionStore((s) => s.busy);
  const [showJson, setShowJson] = useState(false);
  const now = useRef(new Date().toISOString()).current;

  const approved = plan.approvalStatus === "approved";
  const selected =
    plan.scenarios.find((s) => s.id === plan.selectedScenarioId) ?? plan.scenarios[0];

  const opportunities = useMemo(() => generateOpportunities(plan), [plan]);
  const payload = useMemo(
    () =>
      buildOutputPayload({
        plan,
        scenario: selected,
        opportunities,
        resolve: (k) => t(k),
        now,
      }),
    [plan, selected, opportunities, t, now],
  );
  const result = selected ? projectPlan(plan, selected.assumptions) : null;
  const totalEstimated = opportunities.reduce((s, o) => s + o.estimatedValue, 0);

  async function send() {
    await sendToSalesforce(payload);
    toast.success(t("output.sent"));
  }

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          {t("output.title")}
        </h2>
        <p className="mt-1.5 text-muted-foreground">{t("output.subtitle")}</p>
      </div>

      {/* Approval strip */}
      <div
        className={cn(
          "surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4",
          approved && "border-positive/30",
        )}
      >
        <div className="flex items-center gap-3">
          {approved ? (
            <CircleCheckBig className="size-5 shrink-0 text-positive" />
          ) : (
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-muted-foreground/40 text-[10px] text-muted-foreground">
              !
            </span>
          )}
          <div>
            <div className={cn("text-sm font-medium", approved ? "text-positive" : "text-foreground")}>
              {approved ? t("output.approved") : t("output.notApproved")}
            </div>
            <div className="text-xs text-muted-foreground">
              {approved ? t("output.approvedHint") : t("output.approveHint")}
            </div>
          </div>
        </div>
        {approved ? (
          <Button variant="outline" size="sm" onClick={reopenPlan}>
            <RotateCcw className="size-4" />
            {t("output.reopen")}
          </Button>
        ) : (
          <Button
            onClick={() => {
              approvePlan();
              toast.success(t("output.approved"));
            }}
            disabled={!selected}
          >
            <Check className="size-4" />
            {t("output.approve")}
          </Button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Cross-sell */}
        <div className="space-y-5 lg:col-span-2">
          <section className="surface rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("output.crossSell")}</h3>
              <div className="text-xs text-muted-foreground">
                {t("output.estimatedTotal")}{" "}
                <Money value={totalEstimated} compact className="font-medium text-foreground" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {opportunities.map((o, i) => {
                const id = o.categoryKey.split(".").pop() ?? "investments";
                const Icon = CAT_ICON[id] ?? TrendingUp;
                return (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="rounded-xl border border-border bg-card/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", FIT_STYLE[o.fit])}>
                        {t(`output.fit.${o.fit}`)}
                      </span>
                    </div>
                    <div className="mt-2.5 text-sm font-medium text-foreground">{t(o.productKey)}</div>
                    <div className="text-[11px] tracking-wide text-muted-foreground/80 uppercase">{t(o.categoryKey)}</div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{t(o.rationaleKey)}</p>
                    <div className="mt-2.5 text-sm">
                      <span className="text-muted-foreground">{t("output.potential")} </span>
                      <Money value={o.estimatedValue} compact className="font-semibold text-foreground" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {result && (
            <section className="surface rounded-2xl p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("output.generatedData")}</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
                <Row label={t("kpi.wealthAtRetirement")}><Money value={result.wealthAtRetirement} compact /></Row>
                <Row label={t("kpi.probability")}>{result.probabilityOfSuccess}%</Row>
                <Row label={t("kpi.retirementDuration")}>{result.retirementDurationYears} {t("common.years")}</Row>
                <Row label={t("kpi.estate")}><Money value={result.estateAtDeath} compact /></Row>
                <Row label={t("kpi.incomeGap")}><Money value={result.incomeGap} /></Row>
                <Row label={t("suitability.result")}>{plan.suitability.profile ? t(`riskProfile.${plan.suitability.profile}`) : "—"}</Row>
              </div>
            </section>
          )}
        </div>

        {/* API payload */}
        <aside>
          <section className="surface sticky top-20 rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{t("output.payload")}</h3>
              <Button variant="ghost" size="xs" onClick={() => setShowJson((v) => !v)}>
                <Code2 className="size-3.5" />
                {showJson ? t("output.hideJson") : t("output.viewJson")}
              </Button>
            </div>

            {showJson ? (
              <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(payload, null, 2)}
              </pre>
            ) : (
              <dl className="space-y-2 text-sm">
                <Row label="client">{payload.client.name}</Row>
                <Row label="segment">{t(`segment.${payload.client.segment}`)}</Row>
                <Row label="riskProfile">{payload.riskProfile ? t(`riskProfile.${payload.riskProfile}`) : "—"}</Row>
                <Row label="scenario">{payload.approvedScenario?.name ?? "—"}</Row>
                <Row label="crossSell">{payload.crossSell.length} {t("output.opportunities")}</Row>
                <Row label="status">
                  <span className={cn(approved ? "text-positive" : "text-muted-foreground")}>{t(`approval.${payload.meta.status}`)}</span>
                </Row>
                <div className="pt-1 text-[11px] text-muted-foreground/70">
                  {payload.meta.engineVersion}
                </div>
              </dl>
            )}

            {outbound ? (
              <div className="mt-4 rounded-lg border border-positive/30 bg-positive-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-positive">
                  <CircleCheckBig className="size-4" />
                  {t("output.delivered")}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {outbound.ref} · {formatDate(outbound.sentAt, locale, { timeStyle: "short", dateStyle: "short" })}
                </div>
              </div>
            ) : (
              <Button className="mt-4 w-full glow-primary" disabled={!approved || busy} onClick={send}>
                <Send className="size-4" />
                {busy ? t("output.sending") : t("output.send")}
              </Button>
            )}
            {!approved && !outbound && (
              <p className="mt-2 text-center text-xs text-muted-foreground">{t("output.approveToSend")}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{children}</dd>
    </div>
  );
}
