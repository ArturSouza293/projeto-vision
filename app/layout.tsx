import type { Metadata } from "next";
import "./globals.css";
import { sans, heading } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Projeto Vision — Planning Simulation Engine",
  description:
    "Standalone financial planning simulation engine — bank data in, scenario loop, plan + cross-sell payload out.",
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
