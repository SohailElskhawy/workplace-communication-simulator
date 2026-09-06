"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppContainer } from "@/components/app-container";
import { AppHeader } from "@/components/app-header";
import { useLocale } from "@/lib/locale-context";

export function AppLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSimulation = pathname.startsWith("/app/simulations");
  const { direction } = useLocale();

  if (isSimulation) {
    return (
      <div
        className="flex h-dvh w-full flex-col bg-background text-foreground overflow-hidden"
        dir={direction}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground"
      dir={direction}
    >
      <AppHeader />
      <main
        id="main-content"
        className="flex-1 pb-24 pt-4 sm:pb-12 sm:pt-6"
      >
        <AppContainer>{children}</AppContainer>
      </main>
    </div>
  );
}
