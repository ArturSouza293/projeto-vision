"use client";

import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { IntlErrorCode, NextIntlClientProvider } from "next-intl";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { messages } from "@/lib/i18n/messages";
import { useVisionStore } from "@/lib/store/plan-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useVisionStore((s) => s.locale);

  // Keep the document language in sync for accessibility.
  useEffect(() => {
    document.documentElement.lang = locale === "pt-BR" ? "pt-BR" : "en";
  }, [locale]);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="America/Sao_Paulo"
      onError={(error) => {
        // Missing keys degrade gracefully (see getMessageFallback); log the rest.
        if (error.code !== IntlErrorCode.MISSING_MESSAGE) console.error(error);
      }}
      getMessageFallback={({ key }) => key.split(".").pop() ?? key}
    >
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </TooltipProvider>
      </MotionConfig>
    </NextIntlClientProvider>
  );
}
