"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, MapPin, Plus, Radio } from "lucide-react";

import { LocaleToggle } from "@/components/app/locale-toggle";
import { Money } from "@/components/app/money";
import { TopBar } from "@/components/app/top-bar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { salesforce } from "@/lib/api/salesforce";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ClientSummary, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENT_DOT: Record<Segment, string> = {
  retail: "bg-muted-foreground",
  prime: "bg-info",
  principal: "bg-chart-5",
  private: "bg-primary",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function initials(name: string, partner?: string): string {
  const a = name.trim()[0] ?? "";
  const b = partner?.trim()[0] ?? name.trim().split(" ").slice(-1)[0]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function hoursAgo(iso?: string): number {
  if (!iso) return 1;
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
}

function DossierCard({ client }: { client: ClientSummary }) {
  const t = useTranslations();
  const loadClient = useVisionStore((s) => s.loadClient);

  return (
    <motion.button
      type="button"
      variants={item}
      whileHover={{ y: -4 }}
      onClick={() => loadClient(client.id)}
      className="group surface relative flex h-full flex-col overflow-hidden rounded-2xl p-5 text-left transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-[var(--glow-primary)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-11 border border-border">
          <AvatarFallback className="bg-secondary font-heading text-sm font-semibold text-foreground">
            {initials(`${client.firstName} ${client.lastName}`, client.partnerName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-heading text-[15px] font-semibold text-foreground">
            {client.firstName}
            {client.partnerName ? ` & ${client.partnerName}` : ` ${client.lastName}`}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", SEGMENT_DOT[client.segment])} />
              {t(`segment.${client.segment}`)}
            </span>
            {client.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {client.city}
              </span>
            )}
            <span>· {t("intake.ageYears", { age: client.age })}</span>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground/70 tabular-nums">
          {t("intake.receivedAgo", { h: hoursAgo(client.receivedAt) })}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {t(client.taglineKey)}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div>
          <div className="text-[11px] tracking-wide text-muted-foreground/70 uppercase">
            {t("intake.investable")}
          </div>
          <Money value={client.investable} compact className="font-heading text-lg font-semibold text-foreground" />
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {t("intake.open")} <ArrowRight className="size-4" />
        </span>
      </div>
    </motion.button>
  );
}

export function Intake() {
  const t = useTranslations();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const startNewClient = useVisionStore((s) => s.startNewClient);
  const loadingPlan = useVisionStore((s) => s.loadingPlan);

  useEffect(() => {
    let active = true;
    salesforce.inbound.fetchQueue().then((c) => active && setClients(c));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar>
        <LocaleToggle />
      </TopBar>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-9 max-w-2xl"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-positive" />
            </span>
            <Radio className="size-3.5" />
            {t("intake.status", { n: clients?.length ?? 0 })}
          </div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            {t("intake.title")}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("intake.subtitle")}</p>
        </motion.div>

        {clients === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[210px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {clients.map((c) => (
              <DossierCard key={c.id} client={c} />
            ))}
            <motion.button
              type="button"
              variants={item}
              whileHover={{ y: -4 }}
              onClick={startNewClient}
              className="group flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/30 p-5 text-center transition-colors hover:border-primary/50 hover:bg-card/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Plus className="size-5" />
              </span>
              <div>
                <div className="font-heading text-[15px] font-semibold text-foreground">
                  {t("intake.newDossier")}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t("intake.newDossierDesc")}
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border/60 py-5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>{t("intake.engine")}</span>
          <span>{t("app.name")}</span>
        </div>
      </footer>

      {loadingPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t("intake.loading")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
