"use client";

import { useEffect, useState } from "react";

import { Gate } from "@/components/app/gate";
import { Login } from "@/components/app/login";
import { Splash } from "@/components/app/splash";
import { EngineShell } from "@/components/engine/engine-shell";
import { isGateUnlocked } from "@/lib/gate";
import { useVisionStore } from "@/lib/store/plan-store";

export default function Home() {
  const hydrated = useVisionStore((s) => s._hasHydrated);
  const advisorName = useVisionStore((s) => s.advisorName);

  // Gate de acesso (client-side, 1×/navegador). Lido só no cliente para evitar
  // mismatch de hidratação; o Splash cobre o primeiro tick.
  const [gateReady, setGateReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    setUnlocked(isGateUnlocked());
    setGateReady(true);
  }, []);

  if (!hydrated || !gateReady) return <Splash />;
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;
  if (!advisorName.trim()) return <Login />;
  return <EngineShell />;
}
