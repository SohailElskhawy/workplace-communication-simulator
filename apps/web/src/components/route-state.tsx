import Link from "next/link";
import type { ReactNode } from "react";

function Frame({
  children,
  live = false,
}: {
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <section
      aria-live={live ? "polite" : undefined}
      className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs"
    >
      {children}
    </section>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Frame live>
      <div role="status" aria-busy="true">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-r-transparent motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm text-slate-600">{label}</p>
      </div>
    </Frame>
  );
}

export function EmptyState({
  title,
  description,
  href = "/app",
  action = "Browse scenarios",
}: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return (
    <Frame>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
      >
        {action}
      </Link>
    </Frame>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Frame live>
      <div role="alert">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            Try again
          </button>
        ) : (
          <Link
            href="/app"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"
          >
            Return to scenarios
          </Link>
        )}
      </div>
    </Frame>
  );
}
