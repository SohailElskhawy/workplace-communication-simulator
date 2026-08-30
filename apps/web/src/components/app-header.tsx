"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppContainer } from "@/components/app-container";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "Dashboard",
    isActive: (pathname) => pathname === "/app",
  },
  {
    href: "/app/scenarios",
    label: "Scenarios",
    isActive: (pathname) =>
      pathname.startsWith("/app/scenarios") ||
      pathname.startsWith("/app/simulations"),
  },
  {
    href: "/app/progress",
    label: "Progress",
    isActive: (pathname) => pathname.startsWith("/app/progress"),
  },
  {
    href: "/app/history",
    label: "History",
    isActive: (pathname) =>
      pathname.startsWith("/app/history") ||
      pathname.startsWith("/app/results"),
  },
];

export function AppHeader() {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-2xl">
      <AppContainer className="flex flex-wrap items-center justify-between gap-2 py-2 sm:py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2.5 font-display font-bold tracking-tight text-foreground transition-opacity duration-200 hover:opacity-90"
          >
            <span className="brutalist-shadow-sm flex h-8 w-8 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground">
              K
            </span>
            <span className="text-lg max-[360px]:sr-only">Kalemny</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="order-3 flex w-full items-center justify-around gap-1 font-meta text-xs sm:order-0 sm:w-auto sm:justify-start sm:gap-2"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-control px-3 py-1.5 transition-all duration-200 ease-out select-none",
                    active
                      ? "bg-primary text-primary-foreground font-bold shadow-[2px_2px_0px_0px_#1a1a1a] border border-border -translate-x-px -translate-y-px"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-medium border border-transparent",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </AppContainer>
    </header>
  );
}

