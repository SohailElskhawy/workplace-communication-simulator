"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export const CLERK_NEO_BRUTALIST_APPEARANCE = {
  elements: {
    rootBox: "w-full",
    card: "shadow-none bg-transparent border-0 p-0 w-full",
    headerTitle:
      "font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-foreground",
    headerSubtitle: "font-sans text-xs sm:text-sm text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border rounded-control font-display text-xs font-bold uppercase tracking-wider shadow-2xs hover:bg-surface-subtle transition-all",
    formButtonPrimary:
      "bg-primary font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[3px_3px_0px_0px_#1a1a1a] brutalist-interactive",
    formFieldInput:
      "rounded-control border border-border bg-surface text-foreground font-sans focus:border-primary focus:ring-1 focus:ring-primary text-sm",
    formFieldLabel:
      "font-meta text-[11px] uppercase tracking-wider font-bold text-foreground",
    footerActionLink: "font-meta text-xs font-bold text-primary hover:underline",
    identityPreviewText: "font-sans text-sm text-foreground font-medium",
    identityPreviewEditButton:
      "font-meta text-xs text-primary font-bold hover:underline",
    dividerLine: "bg-border/40",
    dividerText: "font-meta text-[10px] uppercase text-muted-foreground font-bold",
  },
};

interface AuthPanelShellProps {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
}

export function AuthPanelShell({ mode, children }: AuthPanelShellProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans flex flex-col justify-between selection:bg-primary selection:text-primary-foreground relative">
      {/* Memphis Dot Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px] z-0"
        aria-hidden="true"
      />

      {/* Top mini-bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-display font-bold tracking-tight text-foreground transition hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground shadow-[2px_2px_0px_0px_#1a1a1a]">
            K
          </span>
          <span className="text-lg font-bold tracking-tight">Kalemny</span>
        </Link>

        <Link
          href="/"
          className="font-meta text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <span>← Back to Home</span>
        </Link>
      </header>

      {/* Main Split Screen Area */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Decorative & Branded Product Area (Hidden on small screens, shown on lg) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-6">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-primary/20 rounded-full bg-primary/10">
                <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
                  Deliberate Practice for High-Stakes Conversations
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.12]">
                Rehearse with realistic pushback. Advance your career.
              </h1>

              <p className="font-sans text-base text-muted-foreground leading-relaxed max-w-xl">
                Simulate difficult workplace conversations—salary negotiations,
                pushing back on managers, delivering tough feedback—and receive
                objective, turn-linked coaching to sharpen your communication.
              </p>

              {/* Feature Checklist */}
              <div className="grid grid-cols-2 gap-3 pt-2 font-meta text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                  <span>6 Curated Scenarios</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                  <span>Voice & Push-to-Talk</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                  <span>5-Skill Objective Rubric</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                  <span>Deterministic Evaluation</span>
                </div>
              </div>
            </div>

            {/* Illustrative Simulation Snapshot Card */}
            <div className="glass-surface rounded-card p-6 border-2 border-border shadow-[6px_6px_0px_0px_#1a1a1a] relative space-y-3 bg-primary/5">
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <span className="font-meta text-[10px] font-bold uppercase tracking-wider text-primary">
                  Evaluation Report Preview
                </span>
                <span className="font-meta text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-[#d4ff00]/40 text-[#171e00]">
                  Overall: 84 / 100
                </span>
              </div>

              <p className="font-sans text-xs italic text-foreground/90 leading-relaxed">
                &quot;Excellent assertive posture during Turn 3. Grounding your
                compensation request in the 32% infrastructure cost reduction
                compelled the VP to agree to an out-of-cycle review.&quot;
              </p>

              <div className="flex items-center gap-3 pt-1 font-meta text-[11px] text-muted-foreground font-semibold">
                <span>Clarity: 88</span>
                <span>·</span>
                <span>Assertiveness: 84</span>
                <span>·</span>
                <span>Empathy: 80</span>
              </div>
            </div>
          </div>

          {/* Right Auth Card Panel (Clerk Container) */}
          <div className="w-full lg:col-span-5 max-w-md mx-auto">
            <div className="glass-surface rounded-card p-6 sm:p-8 border-2 border-border shadow-[8px_8px_0px_0px_#1a1a1a] relative overflow-hidden bg-surface">
              {/* Memphis decorative corner accent */}
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-primary/10 pointer-events-none"
              />

              <div className="mb-4 flex items-center justify-between border-b border-border/20 pb-3">
                <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary">
                  {mode === "sign-in" ? "Sign In" : "Create Account"}
                </span>

                <Link
                  href={mode === "sign-in" ? "/sign-up" : "/sign-in"}
                  className="font-meta text-xs font-semibold text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
                >
                  {mode === "sign-in"
                    ? "Need an account? Sign up"
                    : "Have an account? Sign in"}
                </Link>
              </div>

              {/* Clerk Component Render Area */}
              <div className="w-full flex justify-center">{children}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 border-t border-border/20 text-center font-meta text-[11px] text-muted-foreground">
        Kalemny · AI Workplace Communication Simulator · Release 1 (English)
      </footer>
    </div>
  );
}
