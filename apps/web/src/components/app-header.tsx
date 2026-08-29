import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 transition hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-extrabold text-white shadow-sm">
              K
            </span>
            <span className="text-lg max-[360px]:sr-only">Kalemny</span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="order-3 flex w-full items-center justify-around gap-1 text-sm font-medium text-slate-600 sm:order-none sm:w-auto sm:justify-start sm:gap-2"
          >
            <Link
              href="/app"
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Scenarios
            </Link>
            <Link
              href="/app/progress"
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Progress
            </Link>
            <Link
              href="/app/history"
              className="inline-flex min-h-11 items-center rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
