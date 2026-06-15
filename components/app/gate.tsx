"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ArrowRight } from "@/components/app/icons";
import { BradescoLogo } from "@/components/app/bradesco-logo";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlockGate, verifyGatePassword } from "@/lib/gate";

/**
 * Trava leve de acesso ao protótipo. Branded (parece o app, não uma tela de
 * senha "phishing") e client-side (sem POST). Passa UMA vez por navegador.
 */
export function Gate({ onUnlock }: { onUnlock: () => void }) {
  const t = useTranslations();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    const ok = await verifyGatePassword(value);
    if (ok) {
      unlockGate();
      onUnlock();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-5 sm:px-6">
        <BradescoLogo className="text-primary" />
        <LocaleToggle />
      </header>

      <main className="grid flex-1 place-items-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {t("gate.title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("gate.subtitle")}</p>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
                {t("gate.label")}
              </span>
              <Input
                autoFocus
                type="password"
                autoComplete="off"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={t("gate.placeholder")}
                aria-invalid={error}
              />
            </label>

            {error && <p className="mt-2 text-sm text-negative">{t("gate.wrong")}</p>}

            <Button
              className="mt-6 w-full"
              size="lg"
              disabled={!value.trim() || busy}
              onClick={submit}
            >
              {t("gate.enter")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">{t("gate.note")}</p>
        </div>
      </main>
    </div>
  );
}
