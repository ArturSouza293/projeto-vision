import type { Locale } from "@/lib/types";
import en from "@/messages/en.json";
import ptBR from "@/messages/pt-BR.json";

export type Messages = typeof en;

export const messages: Record<Locale, Messages> = {
  en,
  "pt-BR": ptBR as Messages,
};

export const LOCALES: Locale[] = ["en", "pt-BR"];
