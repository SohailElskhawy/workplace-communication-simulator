import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 transition hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-extrabold text-white shadow-sm">
              K
            </span>
            <span className="text-lg">Kalemny</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-slate-600">
            <Link
              href="/app"
              className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Scenarios
            </Link>
            <Link
              href="/app/progress"
              className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Progress
            </Link>
            <Link
              href="/app/history"
              className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
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
