import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Product wordmark. Reads name + logo from `lib/brand.ts`:
 * - while `brand.logoSrc` is null → a brand-red tile with a growth glyph
 * - set `brand.logoSrc` → swaps to the official logo image (one-line change)
 */
export function BrandMark({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  const label = `${brand.wordmark.lead} ${brand.wordmark.accent}`;
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {brand.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brand.logoSrc}
          alt={label}
          className="size-8 rounded-[10px] object-contain"
        />
      ) : (
        <span className="relative grid size-8 place-items-center overflow-hidden rounded-[10px] bg-primary shadow-sm ring-1 ring-black/5">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 16l5-5 3.5 3L20 6" />
            <circle cx="20" cy="6" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </span>
      )}
      {showWordmark && (
        <span className="font-heading text-[15px] leading-none font-semibold tracking-tight text-foreground">
          {brand.wordmark.lead}{" "}
          <span className="text-primary">{brand.wordmark.accent}</span>
        </span>
      )}
    </span>
  );
}
