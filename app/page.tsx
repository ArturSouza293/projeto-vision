"use client";

import { Login } from "@/components/app/login";
import { Splash } from "@/components/app/splash";
import { EngineShell } from "@/components/engine/engine-shell";
import { useVisionStore } from "@/lib/store/plan-store";

export default function Home() {
  const hydrated = useVisionStore((s) => s._hasHydrated);
  const advisorName = useVisionStore((s) => s.advisorName);

  if (!hydrated) return <Splash />;
  if (!advisorName.trim()) return <Login />;
  return <EngineShell />;
}
