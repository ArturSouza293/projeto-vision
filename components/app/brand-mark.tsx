import { cn } from "@/lib/utils";

/** Project Vision wordmark — a brand-red tile with a growth glyph. */
export function BrandMark({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
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
      {showWordmark && (
        <span className="font-heading text-[15px] leading-none font-semibold tracking-tight text-foreground">
          Projeto <span className="text-primary">Vision</span>
        </span>
      )}
    </span>
  );
}
