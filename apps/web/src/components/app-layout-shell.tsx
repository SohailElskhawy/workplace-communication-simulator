"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppContainer } from "@/components/app-container";
import { AppHeader } from "@/components/app-header";

export function AppLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isSimulation = pathname.startsWith("/app/simulations");

  if (isSimulation) {
    return (
      <div className="flex h-dvh w-full flex-col bg-background text-foreground overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main id="main-content" className="flex-1 py-3 sm:py-8">
        <AppContainer>{children}</AppContainer>
      </main>
    </div>
  );
}
