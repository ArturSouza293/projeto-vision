"use client";

import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/app/brand-mark";

export function Splash() {
  const t = useTranslations();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="animate-pulse">
        <BrandMark />
      </div>
      <p className="text-sm text-muted-foreground">{t("splash.loading")}</p>
    </div>
  );
}
