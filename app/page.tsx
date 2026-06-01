"use client";

import { Splash } from "@/components/app/splash";
import { EntryScreen } from "@/components/journey/entry-screen";
import { JourneyShell } from "@/components/journey/journey-shell";
import { useVisionStore } from "@/lib/store/plan-store";

export default function Home() {
  const hydrated = useVisionStore((s) => s._hasHydrated);
  const hasPlan = useVisionStore((s) => s.activePlan !== null);

  if (!hydrated) return <Splash />;
  return hasPlan ? <JourneyShell /> : <EntryScreen />;
}
