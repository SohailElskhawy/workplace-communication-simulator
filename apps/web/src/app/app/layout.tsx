import type { ReactNode } from "react";

import { AppContainer } from "@/components/app-container";

import { AppHeader } from "../../components/app-header";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <main id="main-content" className="flex-1 py-5 sm:py-8">
        <AppContainer>{children}</AppContainer>
      </main>
    </div>
  );
}
