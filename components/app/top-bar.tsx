"use client";

import { BradescoLogo } from "@/components/app/bradesco-logo";
import { cn } from "@/lib/utils";

/** Sticky top bar: brand on the left, slotted controls on the right. */
export function TopBar({
  children,
  onBrandClick,
  className,
}: {
  children?: React.ReactNode;
  onBrandClick?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-primary text-white",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {onBrandClick ? (
          <button
            type="button"
            onClick={onBrandClick}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <BradescoLogo />
          </button>
        ) : (
          <BradescoLogo />
        )}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
