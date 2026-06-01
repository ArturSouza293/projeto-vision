"use client";

import { useTranslations } from "next-intl";

import { StepHeader } from "@/components/journey/step-header";
import type { JourneyStepId } from "@/lib/types";

export function StepPlaceholder({ stepId }: { stepId: JourneyStepId }) {
  const t = useTranslations();
  return (
    <div>
      <StepHeader title={t(`steps.${stepId}`)} />
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    </div>
  );
}
