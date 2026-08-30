import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Kalemny",
  description: "AI Workplace Communication Simulator",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:font-display focus:text-xs focus:font-bold focus:uppercase focus:text-primary-foreground focus:shadow-brutal focus:outline-none"
          >
            Skip to main content
          </a>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
