"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, MapPin, Plus } from "lucide-react";

import { BrandMark } from "@/components/app/brand-mark";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { TopBar } from "@/components/app/top-bar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fsc } from "@/lib/api/fsc";
import { useVisionStore } from "@/lib/store/plan-store";
import type { ApprovalStatus, ClientSummary, Segment } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENT_DOT: Record<Segment, string> = {
  retail: "bg-muted-foreground",
  prime: "bg-info",
  principal: "bg-chart-5",
  private: "bg-primary",
};

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-warning-muted text-warning",
  approved: "bg-positive-muted text-positive",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function initials(name: string, partner?: string): string {
  const a = name.trim()[0] ?? "";
  const b = partner?.trim()[0] ?? name.trim().split(" ").slice(-1)[0]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function ClientCard({ client }: { client: ClientSummary }) {
  const t = useTranslations();
  const loadClient = useVisionStore((s) => s.loadClient);

  return (
    <motion.button
      type="button"
      variants={item}
      whileHover={{ y: -3 }}
      onClick={() => loadClient(client.id)}
      className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-sm ring-0 transition-shadow hover:border-primary/30 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
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
            <span>· {t("entry.ageYears", { age: client.age })}</span>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_STYLE[client.approvalStatus],
          )}
        >
          {t(`approval.${client.approvalStatus}`)}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {t(client.taglineKey)}
      </p>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {t("entry.completeness", { pct: client.completeness })}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            {t("entry.openPlan")} <ArrowRight className="size-3.5" />
          </span>
        </div>
        <Progress value={client.completeness} className="h-1.5" />
      </div>
    </motion.button>
  );
}

function NewClientCard() {
  const t = useTranslations();
  const startNewClient = useVisionStore((s) => s.startNewClient);
  return (
    <motion.button
      type="button"
      variants={item}
      whileHover={{ y: -3 }}
      onClick={startNewClient}
      className="group flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center transition-colors hover:border-primary/40 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Plus className="size-5" />
      </span>
      <div>
        <div className="font-heading text-[15px] font-semibold text-foreground">
          {t("entry.newClient")}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {t("entry.newClientDesc")}
        </div>
      </div>
    </motion.button>
  );
}

export function EntryScreen() {
  const t = useTranslations();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const loadingPlan = useVisionStore((s) => s.loadingPlan);

  useEffect(() => {
    let active = true;
    fsc.listClients().then((c) => {
      if (active) setClients(c);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar>
        <LocaleToggle />
      </TopBar>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 max-w-2xl"
        >
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("entry.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("entry.subtitle")}</p>
        </motion.div>

        {clients === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] rounded-2xl" />
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
              <ClientCard key={c.id} client={c} />
            ))}
            <NewClientCard />
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border/70 py-5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandMark showWordmark={false} />
          <p className="text-xs text-muted-foreground">
            {t("app.name")} · {t("app.tagline")}
          </p>
        </div>
      </footer>

      {loadingPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
