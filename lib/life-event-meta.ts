/**
 * Life-event preset palette — icon, default direction/amount and chip color per
 * preset. Labels come from i18n (`lifeEvents.preset.${key}`). The drag timeline
 * and the palette both read from here, so adding an event type is one entry.
 */
import {
  Baby,
  Briefcase,
  Car,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Plane,
  Target,
  Wallet,
  Wrench,
  type LucideIcon,
} from "@/components/app/icons";
import type { LifeEventKind } from "@/lib/types";

export interface LifeEventPreset {
  key: string;
  kind: LifeEventKind;
  defaultAmount: number;
  /** Default recurring span in years (one-time when absent). */
  defaultDurationYears?: number;
  icon: LucideIcon;
  /** Tailwind classes for the chip badge. */
  color: string;
}

export const LIFE_EVENT_PRESETS: LifeEventPreset[] = [
  { key: "property_buy", kind: "outflow", defaultAmount: 600000, icon: Home, color: "bg-chart-2/15 text-chart-2" },
  { key: "car", kind: "outflow", defaultAmount: 120000, icon: Car, color: "bg-chart-4/15 text-chart-4" },
  { key: "travel", kind: "outflow", defaultAmount: 30000, icon: Plane, color: "bg-info/15 text-info" },
  { key: "education", kind: "outflow", defaultAmount: 40000, defaultDurationYears: 4, icon: GraduationCap, color: "bg-chart-3/15 text-chart-3" },
  { key: "wedding", kind: "outflow", defaultAmount: 80000, icon: Heart, color: "bg-primary/10 text-primary" },
  { key: "child", kind: "outflow", defaultAmount: 24000, defaultDurationYears: 5, icon: Baby, color: "bg-chart-5/15 text-chart-5" },
  { key: "renovation", kind: "outflow", defaultAmount: 100000, icon: Wrench, color: "bg-chart-4/15 text-chart-4" },
  { key: "business", kind: "outflow", defaultAmount: 200000, icon: Briefcase, color: "bg-chart-5/15 text-chart-5" },
  { key: "property_sell", kind: "inflow", defaultAmount: 600000, icon: Home, color: "bg-positive/10 text-positive" },
  { key: "inheritance", kind: "inflow", defaultAmount: 200000, icon: Landmark, color: "bg-positive/10 text-positive" },
  { key: "bonus", kind: "inflow", defaultAmount: 50000, icon: Wallet, color: "bg-positive/10 text-positive" },
];

export const CUSTOM_PRESET: LifeEventPreset = {
  key: "custom",
  kind: "outflow",
  defaultAmount: 50000,
  icon: Target,
  color: "bg-muted text-foreground",
};

const BY_KEY: Record<string, LifeEventPreset> = Object.fromEntries(
  [...LIFE_EVENT_PRESETS, CUSTOM_PRESET].map((p) => [p.key, p]),
);

export function lifeEventPreset(key: string): LifeEventPreset {
  return BY_KEY[key] ?? CUSTOM_PRESET;
}
