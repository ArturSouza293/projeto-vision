"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ArrowRight } from "@/components/app/icons";
import { BradescoLogo } from "@/components/app/bradesco-logo";
import { LocaleToggle } from "@/components/app/locale-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVisionStore } from "@/lib/store/plan-store";

/** Name-only session gate: identifies the advisor and unlocks the workspace. */
export function Login() {
  const t = useTranslations();
  const setAdvisorName = useVisionStore((s) => s.setAdvisorName);
  const [name, setName] = useState("");

  function submit() {
    const n = name.trim();
    if (n) setAdvisorName(n);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <BradescoLogo className="text-primary" />
        <LocaleToggle />
      </header>

      <main className="grid flex-1 place-items-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-sm">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              {t("login.title")}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("login.subtitle")}</p>

            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">
                {t("login.nameLabel")}
              </span>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={t("login.namePlaceholder")}
              />
            </label>

            <Button className="mt-6 w-full" size="lg" disabled={!name.trim()} onClick={submit}>
              {t("login.enter")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">{t("login.note")}</p>
        </div>
      </main>
    </div>
  );
}
