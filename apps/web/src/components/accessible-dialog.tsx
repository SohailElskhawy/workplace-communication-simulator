"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export interface AccessibleDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
}

export function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
  maxWidthClass = "max-w-md",
}: AccessibleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-3 backdrop-blur-sm sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full ${maxWidthClass ?? "max-w-md"} flex-col overflow-y-auto rounded-card border border-border bg-surface-solid p-5 shadow-overlay outline-none sm:p-7`}
      >
        <h2
          id={titleId}
          className="font-sans text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          {title}
        </h2>
        <p
          id={descriptionId}
          className="mt-1.5 sm:mt-2.5 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
        <div className="mt-3.5 sm:mt-4">{children}</div>
      </div>
    </div>
  );
}
