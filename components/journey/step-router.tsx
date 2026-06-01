"use client";

import { CashflowStep } from "@/components/journey/steps/cashflow-step";
import { GoalsStep } from "@/components/journey/steps/goals-step";
import { NetWorthStep } from "@/components/journey/steps/networth-step";
import { ProfileStep } from "@/components/journey/steps/profile-step";
import { ReviewStep } from "@/components/journey/steps/review-step";
import { ScenariosStep } from "@/components/journey/steps/scenarios-step";
import { SuitabilityStep } from "@/components/journey/steps/suitability-step";
import type { JourneyStepId } from "@/lib/types";

/**
 * Renders the component for the current journey step. Real step components are
 * wired in as they are built; anything not yet implemented falls back to a
 * placeholder so navigation always works.
 */
export function StepRouter({ stepId }: { stepId: JourneyStepId }) {
  switch (stepId) {
    case "profile":
      return <ProfileStep />;
    case "cashflow":
      return <CashflowStep />;
    case "networth":
      return <NetWorthStep />;
    case "suitability":
      return <SuitabilityStep />;
    case "goals":
      return <GoalsStep />;
    case "scenarios":
      return <ScenariosStep />;
    case "review":
      return <ReviewStep />;
    default:
      return null;
  }
}
