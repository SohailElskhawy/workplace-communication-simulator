"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppContainer } from "@/components/app-container";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/lib/locale-context";
import { cn } from "@/lib/cn";

interface NavItem {
  href: string;
  labelKey: string;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    labelKey: "nav.practice",
    isActive: (pathname) =>
      pathname === "/app" ||
      (pathname.startsWith("/app/scenarios") &&
        !pathname.startsWith("/app/scenarios/custom")),
  },
  {
    href: "/app/scenarios/custom",
    labelKey: "nav.interviewPrep",
    isActive: (pathname) => pathname.startsWith("/app/scenarios/custom"),
  },
  {
    href: "/app/history",
    labelKey: "nav.history",
    isActive: (pathname) =>
      pathname.startsWith("/app/history") ||
      pathname.startsWith("/app/results"),
  },
  {
    href: "/app/progress",
    labelKey: "nav.progress",
    isActive: (pathname) => pathname.startsWith("/app/progress"),
  },
];

export function AppHeader() {
  const pathname = usePathname() ?? "";
  const { t, isRtl } = useLocale();

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border bg-surface-solid/90 backdrop-blur-xl"
        data-od-id="app-header"
      >
        <AppContainer className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-6 lg:gap-8">
            <Link
              href="/app"
              className="flex shrink-0 items-center text-foreground hover:opacity-90 transition-opacity"
              data-od-id="kalemny-home-link"
              aria-label={isRtl ? "كلمني - الصفحة الرئيسية" : "Kalemny - Home"}
            >
              <BrandLogo
                variant={isRtl ? "lockup-ar" : "lockup-en"}
                size="md"
                isRtl={isRtl}
              />
            </Link>

            {/* Desktop navigation */}
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-1.5 md:flex"
              data-od-id="desktop-navigation"
            >
              {NAV_ITEMS.map((item) => {
                const active = item.isActive(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center rounded-control border px-3.5 py-2 text-sm font-semibold transition-colors duration-150",
                      active
                        ? "border-border-active/40 bg-selected-surface text-primary"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-subtle hover:text-foreground",
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <Badge tone="coral" className="hidden sm:inline-flex text-[11px] font-semibold">
              {isRtl ? "3 جلسات مجانية / أسبوع" : "3 free sessions / week"}
            </Badge>

            <LocaleToggle />

            <div className="flex items-center ps-1">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8 rounded-full border border-border",
                  },
                }}
              />
            </div>
          </div>
        </AppContainer>
      </header>

      {/* Mobile primary navigation bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-surface-solid/96 p-1.5 shadow-raised backdrop-blur-xl md:hidden"
        data-od-id="mobile-navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-center text-[11px] font-semibold leading-tight transition-colors duration-150",
                active
                  ? "bg-selected-surface text-primary border border-border-active/30"
                  : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
              )}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
