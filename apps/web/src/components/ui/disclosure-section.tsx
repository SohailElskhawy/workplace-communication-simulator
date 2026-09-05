import type { ReactNode } from "react";

export interface DisclosureSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function DisclosureSection({
  id,
  title,
  description,
  children,
  defaultOpen = false,
}: DisclosureSectionProps) {
  return (
    <details
      className="group rounded-card border border-border-subtle bg-surface-solid shadow-xs"
      data-od-id={id}
      open={defaultOpen}
    >
      <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-card px-5 py-4 marker:hidden focus-visible:outline-none sm:px-6">
        <span>
          <span className="block font-display text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle text-lg text-muted-foreground transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="border-t border-border-subtle p-5 [&>section>div:first-child]:hidden sm:p-6">
        {children}
      </div>
    </details>
  );
}
