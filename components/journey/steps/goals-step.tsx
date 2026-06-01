"use client";

import { useTranslations } from "next-intl";
import {
  ChevronDown,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Plus,
  Sunset,
  Target,
  Trash2,
  Umbrella,
  type LucideIcon,
} from "lucide-react";

import { Money } from "@/components/app/money";
import { MoneyInput } from "@/components/app/number-field";
import { StepHeader } from "@/components/journey/step-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { goalFundedPct } from "@/lib/calc";
import { useVisionStore } from "@/lib/store/plan-store";
import type { Goal, GoalPriority, GoalType } from "@/lib/types";
import { cn } from "@/lib/utils";

const GOAL_TYPES: GoalType[] = [
  "retirement",
  "education",
  "property",
  "travel",
  "emergency_reserve",
  "legacy",
  "protection",
  "custom",
];

const GOAL_ICON: Record<GoalType, LucideIcon> = {
  retirement: Sunset,
  education: GraduationCap,
  property: Home,
  travel: Plane,
  emergency_reserve: Umbrella,
  legacy: Landmark,
  protection: HeartPulse,
  custom: Target,
};

const GOAL_COLOR: Record<GoalType, string> = {
  retirement: "bg-chart-5/15 text-chart-5",
  education: "bg-chart-3/15 text-chart-3",
  property: "bg-chart-2/15 text-chart-2",
  travel: "bg-chart-4/15 text-chart-4",
  emergency_reserve: "bg-info/15 text-info",
  legacy: "bg-primary/10 text-primary",
  protection: "bg-negative/10 text-negative",
  custom: "bg-muted text-muted-foreground",
};

const DEFAULT_TARGET: Record<GoalType, number> = {
  retirement: 2000000,
  education: 500000,
  property: 600000,
  travel: 50000,
  emergency_reserve: 60000,
  legacy: 1000000,
  protection: 1000000,
  custom: 100000,
};

const PRIORITIES: GoalPriority[] = ["high", "medium", "low"];

function GoalCard({ goal }: { goal: Goal }) {
  const t = useTranslations();
  const updateGoal = useVisionStore((s) => s.updateGoal);
  const removeGoal = useVisionStore((s) => s.removeGoal);
  const thisYear = new Date().getFullYear();
  const years = Math.max(0, goal.targetYear - thisYear);
  const funded = Math.round(goalFundedPct(goal, 0.04, thisYear));
  const Icon = GOAL_ICON[goal.type];

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", GOAL_COLOR[goal.type])}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Input
            value={goal.label ?? ""}
            placeholder={t(`goalType.${goal.type}`)}
            onChange={(e) => updateGoal(goal.id, { label: e.target.value })}
            className="h-7 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
          />
          <div className="text-xs text-muted-foreground">
            {t(`goalType.${goal.type}`)} · {t("goals.horizon", { years })}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => removeGoal(goal.id)}>
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("goals.funded", { pct: funded })}</span>
          <Money value={goal.targetAmount} compact className="font-medium" />
        </div>
        <Progress value={funded} className="h-1.5" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label={t("goals.targetAmount")}>
          <MoneyInput value={goal.targetAmount} onChange={(n) => updateGoal(goal.id, { targetAmount: n })} />
        </Field>
        <Field label={t("goals.currentAmount")}>
          <MoneyInput value={goal.currentAmount} onChange={(n) => updateGoal(goal.id, { currentAmount: n })} />
        </Field>
        <Field label={t("goals.targetYear")}>
          <Input
            type="number"
            value={goal.targetYear}
            onChange={(e) => updateGoal(goal.id, { targetYear: e.target.valueAsNumber || thisYear })}
            className="tabular-nums"
          />
        </Field>
        <Field label={t("goals.monthlyContribution")}>
          <MoneyInput
            value={goal.monthlyContribution ?? 0}
            onChange={(n) => updateGoal(goal.id, { monthlyContribution: n })}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Select
          value={goal.priority}
          onValueChange={(v) => updateGoal(goal.id, { priority: v as GoalPriority })}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <span className="text-muted-foreground">{t("goals.priority")}:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`priority.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function GoalsStep() {
  const t = useTranslations();
  const goals = useVisionStore((s) => s.activePlan!.goals);
  const addGoal = useVisionStore((s) => s.addGoal);
  const thisYear = new Date().getFullYear();

  function addGoalOfType(type: GoalType) {
    addGoal({
      type,
      targetAmount: DEFAULT_TARGET[type],
      targetYear: thisYear + (type === "retirement" ? 25 : type === "travel" ? 3 : 10),
      priority: "medium",
      currentAmount: 0,
      monthlyContribution: 0,
    });
  }

  return (
    <div>
      <StepHeader title={t("goals.title")} subtitle={t("goals.subtitle")} />

      <div className="mb-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="size-4" />
              {t("goals.addGoal")}
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {GOAL_TYPES.map((type) => {
              const Icon = GOAL_ICON[type];
              return (
                <DropdownMenuItem key={type} onClick={() => addGoalOfType(type)}>
                  <Icon className="size-4" />
                  {t(`goalType.${type}`)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {goals.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center text-sm text-muted-foreground">
          {t("goals.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
