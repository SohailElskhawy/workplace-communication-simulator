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
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-xl">
      <AppContainer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-2 sm:py-2.5">
        <div className="flex flex-1 items-center justify-between sm:justify-start gap-3 sm:gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2 sm:gap-2.5 font-display font-bold tracking-tight text-foreground transition-opacity duration-200 hover:opacity-90 shrink-0"
          >
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground shadow-[2px_2px_0px_0px_#1a1a1a]">
              K
            </span>
            <span className="text-base sm:text-lg font-bold">Kalemny</span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden sm:flex items-center gap-1.5 font-meta text-xs"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-8 sm:min-h-9 items-center rounded-control px-2.5 sm:px-3 py-1 sm:py-1.5 transition-all duration-200 ease-out select-none whitespace-nowrap font-bold",
                    active
                      ? "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_#1a1a1a] border border-border -translate-x-px -translate-y-px"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-semibold border border-transparent",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: User profile */}
        <div className="flex items-center gap-2 shrink-0">
          <UserButton />
        </div>

        {/* Mobile Navigation Row */}
        <nav
          aria-label="Mobile primary navigation"
          className="sm:hidden flex w-full items-center justify-between gap-1 font-meta text-[11px] pt-1.5 border-t border-border/15"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex-1 inline-flex h-7 items-center justify-center rounded-control px-1 text-center transition-all duration-200 ease-out select-none whitespace-nowrap font-bold",
                  active
                    ? "bg-primary text-primary-foreground shadow-[1.5px_1.5px_0px_0px_#1a1a1a] border border-border"
                    : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground font-semibold border border-transparent",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </AppContainer>
    </header>
  );
}
