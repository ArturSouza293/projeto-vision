"use client";

/**
 * v9 — abas de primeiro nível do registro do cliente (Cliente 360 · Life
 * Planning). Padrão ARIA de tabs: role=tablist/tab, aria-selected, roving
 * tabindex, navegação por setas/Home/End, foco visível. Os PAINÉIS (role=
 * tabpanel) vivem no engine-shell e referenciam estes ids via aria-labelledby.
 */
import { useRef } from "react";
import { useTranslations } from "next-intl";

import { ScanFace, SlidersHorizontal } from "@/components/app/icons";
import type { ClientTab } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CLIENT_TAB_IDS: Record<ClientTab, { tab: string; panel: string }> = {
  client360: { tab: "ctab-client360", panel: "cpanel-client360" },
  lifePlanning: { tab: "ctab-life-planning", panel: "cpanel-life-planning" },
};

const TABS: {
  value: ClientTab;
  labelKey: string;
  testid: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "client360", labelKey: "clientTabs.client360", testid: "tab-client-360", icon: ScanFace },
  { value: "lifePlanning", labelKey: "clientTabs.lifePlanning", testid: "tab-life-planning", icon: SlidersHorizontal },
];

export function ClientRecordTabs({
  value,
  onChange,
}: {
  value: ClientTab;
  onChange: (tab: ClientTab) => void;
}) {
  const t = useTranslations();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    onChange(TABS[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={t("clientTabs.ariaLabel")}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-[var(--elev-1)]"
    >
      {TABS.map((tab, idx) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            type="button"
            role="tab"
            id={CLIENT_TAB_IDS[tab.value].tab}
            aria-selected={active}
            aria-controls={CLIENT_TAB_IDS[tab.value].panel}
            tabIndex={active ? 0 : -1}
            data-testid={tab.testid}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, idx)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-4",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
