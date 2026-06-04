"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarPlus, Send, Sparkles } from "@/components/app/icons";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildAdvisorContext } from "@/lib/advisor-context";
import { formatDate } from "@/lib/format";
import { useVisionStore } from "@/lib/store/plan-store";
import type { AdvisorEventType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ParsedEvent {
  title: string;
  date: string;
  type: AdvisorEventType;
  notes?: string;
}

/** Extract a trailing ```event {json}``` block from an assistant message. */
function parseEvent(content: string): { text: string; event: ParsedEvent | null } {
  const match = content.match(/```event\s*([\s\S]*?)```/);
  if (!match) return { text: content, event: null };
  let event: ParsedEvent | null = null;
  try {
    const raw = JSON.parse(match[1].trim());
    if (raw && typeof raw.title === "string") {
      event = {
        title: raw.title,
        date: typeof raw.date === "string" ? raw.date : new Date().toISOString().slice(0, 10),
        type: (["review", "rebalancing", "contribution", "meeting", "other"].includes(raw.type)
          ? raw.type
          : "other") as AdvisorEventType,
        notes: typeof raw.notes === "string" ? raw.notes : undefined,
      };
    }
  } catch {
    event = null;
  }
  return { text: content.replace(match[0], "").trim(), event };
}

export function CopilotPanel() {
  const t = useTranslations();
  const locale = useVisionStore((s) => s.locale);
  const addEvent = useVisionStore((s) => s.addEvent);
  const events = useVisionStore((s) => s.activePlan?.events ?? []);
  const plan = useVisionStore((s) => s.activePlan);
  const copilotPrompt = useVisionStore((s) => s.copilotPrompt);
  const clearCopilotPrompt = useVisionStore((s) => s.clearCopilotPrompt);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => (plan ? buildAdvisorContext(plan, locale) : undefined), [plan, locale]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Consume a pending "ask Bia" prompt (set from a KPI/goal button).
  useEffect(() => {
    if (copilotPrompt && !streaming) {
      void send(copilotPrompt);
      clearCopilotPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotPrompt]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });

      if (res.headers.get("x-advisor") === "no-key") {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: t("copilot.noKey") };
          return copy;
        });
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: `⚠️ ${err instanceof Error ? err.message : "error"}`,
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function acceptEvent(index: number, ev: ParsedEvent) {
    addEvent({ title: ev.title, date: ev.date, type: ev.type, notes: ev.notes });
    setAdded((s) => new Set(s).add(index));
    toast.success(t("copilot.eventAdded"));
  }

  const SUGGESTIONS = ["copilot.suggestions.s1", "copilot.suggestions.s2", "copilot.suggestions.s3"];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {events.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
          {events.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
            >
              <CalendarPlus className="size-3" />
              {e.title}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 pt-6">
            <p className="text-center text-sm text-muted-foreground">{t("copilot.empty")}</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => send(t(key))}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => {
            const { text, event } = m.role === "assistant" ? parseEvent(m.content) : { text: m.content, event: null };
            return (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {text || (streaming && i === messages.length - 1 ? "…" : text)}
                  {event && (
                    <div className="mt-2 rounded-xl border border-border bg-card p-3 text-foreground">
                      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {t("copilot.suggestEvent")}
                      </div>
                      <div className="mt-1 font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(event.date, locale)} · {t(`eventType.${event.type}`)}
                      </div>
                      {event.notes && <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>}
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={added.has(i)}
                        onClick={() => acceptEvent(i, event)}
                      >
                        <CalendarPlus className="size-4" />
                        {added.has(i) ? t("copilot.eventAdded") : t("copilot.acceptEvent")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={t("copilot.placeholder")}
            rows={2}
            className="max-h-32 min-h-0 flex-1 resize-none"
          />
          <Button
            size="icon"
            disabled={streaming || !input.trim()}
            onClick={() => send(input)}
            aria-label={t("copilot.send")}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
