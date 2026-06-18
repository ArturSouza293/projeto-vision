"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ícone "(i)" com explicação curta no hover/foco — para termos não óbvios
 * (Share of Wallet, suitability, IPCA+, perpetuidade, horizonte de renda,
 * ITCMD, Disciplina Mensal, …). O texto vem do chamador (i18n `tooltips.*`).
 *
 * Acessível: é um <button> com aria-label; abre por hover E por foco (Radix).
 */
export function InfoTip({
  children,
  label,
  className,
  side = "top",
}: {
  children: ReactNode;
  /** rótulo acessível do botão (ex.: o termo explicado) */
  label?: string;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label ? `O que é ${label}?` : "Mais informações"}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-left leading-snug">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
