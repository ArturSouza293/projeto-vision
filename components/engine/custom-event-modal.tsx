"use client";

/**
 * v5 — Modal de evento customizado com peer insights.
 *
 * Aba 1 "Sugestões para você": carrossel de cards "o que pessoas como você
 * estão planejando?" — estatística-âncora ilustrativa + proposta com números
 * do CASO calculados localmente (Regra Zero: dataset curado + heurística;
 * nenhuma IA, nada sai do app).
 * Aba 2 "Criar do zero": formulário completo (nome, categoria, fluxo, valor
 * com stepper e eco anual, único/recorrente, ano + mês, duração, vínculo a
 * objetivo) com dica de peer por categoria.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
  Briefcase,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Minus,
  Plane,
  Plus,
  ShieldAlert,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from "@/components/app/icons";
import { MoneyInput } from "@/components/app/number-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  categoriaTipValue,
  eventoFromInsight,
  insightValue,
  peerInsightsProvider,
  perfilFromPlan,
  type PeerInsight,
} from "@/lib/peer-insights";
import { CUSTOM_PRESET, LIFE_EVENT_PRESETS } from "@/lib/life-event-meta";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { LifeEventKind, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARD_ICONS: Record<string, LucideIcon> = {
  ShieldAlert,
  HeartPulse,
  Plane,
  GraduationCap,
  Wrench,
  Compass,
  Heart,
  Home,
  Briefcase,
  Car,
};

const VISIBLE = 3;

export function CustomEventModal({
  plan,
  open,
  onOpenChange,
  maxYear,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maxYear: number;
}) {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const addLifeEvent = useVisionStore((s) => s.addLifeEvent);
  const cur = (n: number) => formatCurrency(n, locale);

  const thisYear = new Date().getFullYear();
  const perfil = useMemo(() => perfilFromPlan(plan), [plan]);
  const insights = useMemo(() => peerInsightsProvider.getInsights(perfil), [perfil]);

  const [tab, setTab] = useState<"sugestoes" | "criar">("sugestoes");
  const [page, setPage] = useState(0);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const maxPage = Math.max(0, insights.length - VISIBLE);

  /* ---- aba "Criar do zero" ---- */
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState(CUSTOM_PRESET.key);
  const [kind, setKind] = useState<LifeEventKind>("outflow");
  const [valor, setValor] = useState(50000);
  const [recorrente, setRecorrente] = useState(false);
  const [ano, setAno] = useState(thisYear + 5);
  const [mes, setMes] = useState<number | null>(null);
  const [duracao, setDuracao] = useState(3);
  const [goalId, setGoalId] = useState<string>("");
  const [tipDismissed, setTipDismissed] = useState(false);

  const tip = tipDismissed ? null : categoriaTipValue(categoria, perfil);
  const monthName = (m: number) =>
    new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en", { month: "long" }).format(
      new Date(2026, m - 1, 1),
    );

  function toggle(id: string) {
    setSelecionados((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function aplicarSugestoes() {
    for (const ins of insights.filter((i) => selecionados.has(i.id))) {
      const label = t(`peer.cards.${ins.id}.titulo`);
      addLifeEvent(eventoFromInsight(ins, perfil, label, thisYear));
    }
    setSelecionados(new Set());
    onOpenChange(false);
  }

  function criarEvento() {
    addLifeEvent({
      presetKey: categoria,
      label: nome.trim() || undefined,
      kind,
      year: Math.min(Math.max(ano, thisYear), maxYear),
      month: mes ?? undefined,
      amount: Math.max(0, valor),
      recurring: recorrente || undefined,
      endYear: recorrente ? Math.min(ano + Math.max(1, duracao) - 1, maxYear) : undefined,
      goalId: goalId || undefined,
    });
    onOpenChange(false);
  }

  function Stepper({
    value,
    onChange,
    step,
    min,
    max,
  }: {
    value: number;
    onChange: (v: number) => void;
    step: number;
    min: number;
    max: number;
  }) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" type="button" onClick={() => onChange(Math.max(min, value - step))}>
          <Minus className="size-3.5" />
        </Button>
        <Button variant="outline" size="icon-sm" type="button" onClick={() => onChange(Math.min(max, value + step))}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="peer-modal"
        className="flex max-h-[90vh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <DialogHeader className="space-y-1 border-b border-border px-6 pt-5 pb-4 text-left">
          <DialogTitle className="font-heading text-xl">{t("peer.title")}</DialogTitle>
          <DialogDescription>{t("peer.subtitle")}</DialogDescription>
          {/* segmented tabs */}
          <div className="mt-2 inline-flex w-fit rounded-full border border-border bg-muted/40 p-0.5 text-sm">
            {(["sugestoes", "criar"] as const).map((k) => (
              <button
                key={k}
                type="button"
                data-testid={`peer-tab-${k}`}
                onClick={() => setTab(k)}
                className={cn(
                  "rounded-full px-4 py-1.5 font-medium transition-colors",
                  tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`peer.tab.${k}`)}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === "sugestoes" ? (
            <div>
              {/* profile chips — derived from the real case */}
              <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">{t("peer.chipsLabel")}</span>
                {[
                  t("peer.chipIdade", { faixa: perfil.faixaEtaria }),
                  t("peer.chipRenda", { valor: formatCompactCurrency(perfil.rendaMensal, locale) }),
                  t(`peer.chipComposicao.${perfil.composicao}`),
                  t(`segment.${perfil.segmento}`),
                ].map((chip, i) => (
                  <span key={i} className="rounded-full bg-primary/[0.07] px-2.5 py-1 font-medium text-primary">
                    {chip}
                  </span>
                ))}
              </div>

              {/* carousel */}
              <div className="relative">
                <div className="overflow-hidden">
                  <div
                    className="flex gap-3 transition-transform duration-300"
                    style={{ transform: `translateX(calc(-${page} * (33.333% + 0.25rem)))` }}
                  >
                    {insights.map((ins) => (
                      <PeerCard
                        key={ins.id}
                        insight={ins}
                        valor={cur(insightValue(ins, perfil))}
                        selected={selecionados.has(ins.id)}
                        onToggle={() => toggle(ins.id)}
                      />
                    ))}
                  </div>
                </div>
                {page > 0 && (
                  <CarouselArrow side="left" onClick={() => setPage((p) => Math.max(0, p - 1))} />
                )}
                {page < maxPage && (
                  <CarouselArrow side="right" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} />
                )}
              </div>
              {/* dots */}
              <div className="mt-3 flex justify-center gap-1.5">
                {Array.from({ length: maxPage + 1 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${i + 1}`}
                    onClick={() => setPage(i)}
                    className={cn(
                      "size-2 rounded-full transition-colors",
                      i === page ? "bg-primary" : "bg-border hover:bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.name")}</span>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("eventForm.namePh")} />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.category")}</span>
                <Select value={categoria} onValueChange={(v) => { setCategoria(v); setTipDismissed(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...LIFE_EVENT_PRESETS, CUSTOM_PRESET].map((p) => (
                      <SelectItem key={p.key} value={p.key}>{t(`lifeEvents.preset.${p.key}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div>
                <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.flow")}</span>
                <div className="inline-flex rounded-full border border-border p-0.5 text-sm">
                  {(["outflow", "inflow"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={cn(
                        "rounded-full px-3 py-1 font-medium transition-colors",
                        kind === k
                          ? k === "inflow" ? "bg-positive-muted text-positive" : "bg-negative/10 text-negative"
                          : "text-muted-foreground",
                      )}
                    >
                      {t(`lifeEvents.${k}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.amount")}</span>
                <div className="flex items-center gap-2">
                  <MoneyInput value={valor} onChange={setValor} className="w-36" />
                  <Stepper value={valor} onChange={setValor} step={5000} min={0} max={100000000} />
                </div>
                {recorrente && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("eventForm.annualEcho", { total: cur(valor * Math.max(1, duracao)) })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={recorrente} onCheckedChange={setRecorrente} id="ev-rec" />
                <label htmlFor="ev-rec" className="text-sm text-muted-foreground">
                  {t("eventForm.recurring")}
                </label>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.year")}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={ano}
                      min={thisYear}
                      max={maxYear}
                      onChange={(e) => setAno(e.target.valueAsNumber || thisYear)}
                      className="w-24 tabular-nums"
                    />
                    <Stepper value={ano} onChange={setAno} step={1} min={thisYear} max={maxYear} />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.month")}</span>
                  <Select value={mes === null ? "none" : String(mes)} onValueChange={(v) => setMes(v === "none" ? null : Number(v))}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("eventForm.monthDefault")}</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{monthName(i + 1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                {recorrente && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.duration")}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={duracao}
                        min={1}
                        max={40}
                        onChange={(e) => setDuracao(e.target.valueAsNumber || 1)}
                        className="w-20 tabular-nums"
                      />
                      <Stepper value={duracao} onChange={setDuracao} step={1} min={1} max={40} />
                    </div>
                  </label>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t("eventForm.goalLink")}</span>
                <Select value={goalId || "none"} onValueChange={(v) => setGoalId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("eventForm.goalNone")}</SelectItem>
                    {plan.goals.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label || t(`goalType.${g.type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {tip !== null && (
                <div className="flex items-start justify-between gap-2 rounded-xl bg-info/[0.07] px-3 py-2 text-xs text-info sm:col-span-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 shrink-0" />
                    {t("peer.tipCategoria", { valor: cur(tip) })}
                  </span>
                  <button type="button" onClick={() => setTipDismissed(true)} aria-label={t("common.close")}>
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <span className="text-[10px] text-muted-foreground">{t("peer.illustrativeNote")}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
            {tab === "sugestoes" ? (
              <Button data-testid="peer-apply" disabled={selecionados.size === 0} onClick={aplicarSugestoes}>
                <Plus className="size-4" />
                {t("peer.addToPlan", { n: selecionados.size })}
              </Button>
            ) : (
              <Button data-testid="peer-create" onClick={criarEvento}>
                <Plus className="size-4" />
                {t("eventForm.create")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CarouselArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side}
      className={cn(
        "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-card shadow-md transition-colors hover:bg-muted",
        side === "left" ? "-left-3" : "-right-3",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function PeerCard({
  insight,
  valor,
  selected,
  onToggle,
}: {
  insight: PeerInsight;
  valor: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();
  const Icon = CARD_ICONS[insight.icone] ?? Sparkles;
  return (
    <div
      data-testid={`peer-card-${insight.id}`}
      className={cn(
        "flex w-[calc(33.333%-0.5rem)] shrink-0 flex-col rounded-2xl border bg-card p-4 transition-colors",
        selected ? "border-primary/60 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]" : "border-border",
      )}
    >
      <span className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/[0.08] text-primary">
        <Icon className="size-5" />
      </span>
      <h4 className="font-heading text-sm leading-snug font-semibold text-foreground">
        {t(`peer.cards.${insight.id}.titulo`)}
      </h4>

      <div className="mt-3">
        <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{t("peer.relevTitle")}</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-heading text-2xl font-bold text-primary">{insight.relevancia.statDestaque}</span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {t(`peer.cards.${insight.id}.stat`)}
        </p>
      </div>

      <div className="mt-3 rounded-xl bg-muted/50 p-2.5">
        <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{t("peer.considerTitle")}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground/85">
          {t(`peer.cards.${insight.id}.sugestao`, { valor })}
        </p>
      </div>

      <div className="mt-auto pt-3">
        <p className="mb-2 text-[11px] text-muted-foreground">
          {t("peer.social", { n: insight.provaSocial.de10 })}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground hover:border-primary/40",
          )}
        >
          {selected && <Check className="size-3.5" />}
          {selected ? t("peer.selected") : t("peer.addAsEvent")}
        </button>
      </div>
    </div>
  );
}
