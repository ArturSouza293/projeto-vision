import type { Metadata, Viewport } from "next";
import "./globals.css";
import { sans, heading } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Projeto Vision — Planning Simulation Engine",
  description:
    "Standalone financial planning simulation engine — bank data in, scenario loop, plan + cross-sell payload out.",
};

// Mobile chrome: device-width + brand-tinted browser bar. Zoom stays ENABLED
// (no maximumScale/userScalable) for accessibility on any device.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ce2a47",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
