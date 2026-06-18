"use client";

import { useEffect, useState } from "react";
import { Landmark, FileText, FlaskConical, CreditCard, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

export type DataSource = "open-finance" | "ir" | "cartao" | "mock";

const SOURCE_META: Record<DataSource, { label: string; icon: typeof Landmark }> = {
  "open-finance": { label: "via Open Finance", icon: Landmark },
  ir: { label: "via IR", icon: FileText },
  cartao: { label: "via cartão", icon: CreditCard },
  mock: { label: "simulado", icon: FlaskConical },
};

/**
 * Selo de ORIGEM do dado (marca visual obrigatória nesta fase de mocks):
 * "via Open Finance" / "via IR" / "via cartão" / "simulado". Não chama API real.
 * `label` opcional sobrescreve o texto (i18n `dataSource.*`).
 */
export function SourceBadge({
  source,
  label,
  className,
}: {
  source: DataSource;
  label?: string;
  className?: string;
}) {
  const meta = SOURCE_META[source];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-2.5" aria-hidden />
      {label ?? meta.label}
    </span>
  );
}

/** Meses decorridos entre `iso` e agora (>= 0). Retorna null se data inválida. */
export function monthsSince(iso: string, now: Date): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

/**
 * Carimbo de "última atualização" + alerta de "dados desatualizados" acima de
 * `staleMonths` (limiar parametrizável, default 6). A staleness é calculada no
 * cliente (após mount) para não quebrar a hidratação.
 */
export function FreshnessStamp({
  date,
  staleMonths = 6,
  prefix = "Atualizado",
  staleLabel = "dados desatualizados",
  className,
}: {
  date: string;
  staleMonths?: number;
  prefix?: string;
  staleLabel?: string;
  className?: string;
}) {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    const m = monthsSince(date, new Date());
    setStale(m !== null && m >= staleMonths);
  }, [date, staleMonths]);

  const fmt = (() => {
    const d = new Date(date);
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  })();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px]",
        stale ? "text-warning" : "text-muted-foreground/70",
        className,
      )}
      title={stale ? staleLabel : undefined}
    >
      {stale && <AlertTriangle className="size-2.5" aria-hidden />}
      {prefix} {fmt}
      {stale && <span className="font-medium">· {staleLabel}</span>}
    </span>
  );
}
