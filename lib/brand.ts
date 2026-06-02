// ============================================================
//  BRAND CONFIG — single source of truth for swappable assets
// ------------------------------------------------------------
//  The Liquid design handoff flags three substitutions to replace
//  when the official Bradesco assets arrive (README §Caveats):
//  font, icons, logo. Each has ONE swap point, referenced here.
// ============================================================

export const brand = {
  /** Product wordmark, rendered by <BrandMark>. */
  wordmark: { lead: "Projeto", accent: "Vision" },

  /**
   * Official logo image. While `null`, <BrandMark> draws the red glyph tile.
   * To use the real mark: drop the file in /public (e.g. /brand/logo.svg) and
   * set `logoSrc: "/brand/logo.svg"` — <BrandMark> switches to an <img>.
   */
  logoSrc: null as string | null,

  /**
   * Type families. The @next/font loaders live in `app/fonts.ts` and expose
   * these CSS variables; `globals.css` maps them to the Tailwind font tokens.
   * SWAP THE FONT in app/fonts.ts (not here).
   */
  fonts: { body: "var(--font-sans)", display: "var(--font-heading)" },

  /**
   * Icon set. Lucide is a substitution for the masked Liquid glyphs. Product
   * icons are re-exported from `components/app/icons.ts` — SWAP THE ICON SET
   * there. `strokeWidth` is the Liquid default (stroke 2, round joins).
   */
  icons: { library: "lucide-react", strokeWidth: 2 },
} as const;

export type Brand = typeof brand;
