// ============================================================
//  FONT SWAP POINT — Liquid Design System
// ------------------------------------------------------------
//  The Bradesco "Liquid" handoff did NOT ship the real brand font
//  (README §Caveats). Nunito Sans (body) + Nunito (heavy display)
//  are geometric-humanist stand-ins that match the specimens.
//
//  When the official .woff2 files arrive, drop them in app/fonts/
//  and replace the two loaders below with next/font/local — KEEP the
//  same `variable` names (--font-sans / --font-heading) so globals.css
//  and every component keep working untouched:
//
//    import localFont from "next/font/local";
//    export const sans = localFont({
//      variable: "--font-sans",
//      display: "swap",
//      src: [
//        { path: "./fonts/Brand-Regular.woff2", weight: "400", style: "normal" },
//        { path: "./fonts/Brand-Bold.woff2",    weight: "700", style: "normal" },
//      ],
//    });
//    export const heading = localFont({ variable: "--font-heading", display: "swap", src: [...] });
// ============================================================

import { Nunito, Nunito_Sans } from "next/font/google";

/** Body / UI text → CSS var --font-sans */
export const sans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** Heavy display (headings, figures, wordmark) → CSS var --font-heading */
export const heading = Nunito({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});
