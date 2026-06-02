"use client";

import { Splash } from "@/components/app/splash";
import { EngineShell } from "@/components/engine/engine-shell";
import { Intake } from "@/components/engine/intake";
import { useVisionStore } from "@/lib/store/plan-store";

export default function Home() {
  const hydrated = useVisionStore((s) => s._hasHydrated);
  const hasPlan = useVisionStore((s) => s.activePlan !== null);

  if (!hydrated) return <Splash />;
  return hasPlan ? <EngineShell /> : <Intake />;
}
