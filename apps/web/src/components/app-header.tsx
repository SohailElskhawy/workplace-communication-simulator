import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { AppContainer } from "@/components/app-container";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur-2xl">
      <AppContainer className="flex flex-wrap items-center justify-between gap-2 py-2 sm:py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2.5 font-display font-bold tracking-tight text-foreground transition hover:opacity-90"
          >
            <span className="brutalist-shadow-sm flex h-8 w-8 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground">
              K
            </span>
            <span className="text-lg max-[360px]:sr-only">Kalemny</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="order-3 flex w-full items-center justify-around gap-1 font-meta text-xs text-muted-foreground sm:order-0 sm:w-auto sm:justify-start sm:gap-2"
          >
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center rounded-control px-2.5 py-1.5 transition hover:bg-surface-subtle hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/app/scenarios"
              className="inline-flex min-h-11 items-center rounded-control px-2.5 py-1.5 transition hover:bg-surface-subtle hover:text-foreground"
            >
              Scenarios
            </Link>
            <Link
              href="/app/progress"
              className="inline-flex min-h-11 items-center rounded-control px-2.5 py-1.5 transition hover:bg-surface-subtle hover:text-foreground"
            >
              Progress
            </Link>
            <Link
              href="/app/history"
              className="inline-flex min-h-11 items-center rounded-control px-2.5 py-1.5 transition hover:bg-surface-subtle hover:text-foreground"
            >
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </AppContainer>
    </header>
  );
}
