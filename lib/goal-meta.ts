/**
 * Shared goal presentation metadata — icon + color per goal type.
 * Single source of truth reused by the goals step and the KPI detail modal.
 * Per-goal descriptions come from i18n: `goalDescription.${type}`.
 */
import {
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Sunset,
  Target,
  Umbrella,
  type LucideIcon,
} from "@/components/app/icons";
import type { GoalType } from "@/lib/types";

export const GOAL_TYPES: GoalType[] = [
  "retirement",
  "education",
  "property",
  "travel",
  "emergency_reserve",
  "legacy",
  "protection",
  "custom",
];

export const GOAL_ICON: Record<GoalType, LucideIcon> = {
  retirement: Sunset,
  education: GraduationCap,
  property: Home,
  travel: Plane,
  emergency_reserve: Umbrella,
  legacy: Landmark,
  protection: HeartPulse,
  custom: Target,
};

export const GOAL_COLOR: Record<GoalType, string> = {
  retirement: "bg-chart-5/15 text-chart-5",
  education: "bg-chart-3/15 text-chart-3",
  property: "bg-chart-2/15 text-chart-2",
  travel: "bg-chart-4/15 text-chart-4",
  emergency_reserve: "bg-info/15 text-info",
  legacy: "bg-primary/10 text-primary",
  protection: "bg-negative/10 text-negative",
  custom: "bg-muted text-muted-foreground",
};
