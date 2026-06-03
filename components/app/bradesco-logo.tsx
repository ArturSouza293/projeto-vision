import { cn } from "@/lib/utils";

/**
 * Bradesco wordmark, drawn in `currentColor` (white on the red header, red on
 * light surfaces). Kept as clean type rather than a redrawn symbol; drop the
 * official logo SVG/PNG in /public and render an <img> here for a pixel-perfect mark.
 */
export function BradescoLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-[22px] leading-none font-extrabold lowercase tracking-[-0.03em] select-none",
        className,
      )}
    >
      bradesco
    </span>
  );
}
