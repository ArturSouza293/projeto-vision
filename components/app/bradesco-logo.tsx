import { cn } from "@/lib/utils";

/**
 * Bradesco brand lockup (symbol + wordmark), drawn in `currentColor` so it
 * renders white on the red header. This is an in-app recreation; if a
 * pixel-perfect official asset is needed, drop the SVG/PNG in /public and
 * render an <img> here instead.
 */
export function BradescoLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 60 52"
        className="h-7 w-auto shrink-0"
        fill="currentColor"
        aria-hidden="true"
      >
        {/* canopy / swoosh */}
        <path d="M3 29.5 C 8 11.5, 33 3.5, 56 15.5 C 37 8.5, 14 14.5, 12.2 29.5 C 9 30, 6 30, 3 29.5 Z" />
        {/* trunk bars */}
        <rect x="20.2" y="33" width="4.1" height="16" rx="2.05" />
        <rect x="26.5" y="30.5" width="4.1" height="18.5" rx="2.05" />
        <rect x="32.8" y="34.5" width="4.1" height="14.5" rx="2.05" />
      </svg>
      <span className="font-heading text-[22px] leading-none font-extrabold lowercase tracking-[-0.02em]">
        bradesco
      </span>
    </span>
  );
}
