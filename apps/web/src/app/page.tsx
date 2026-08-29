"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";
import {
  DEFAULT_MOCK_SCENARIOS,
  getScenarioMeta,
} from "./app/scenario-library-view";

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

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

function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function MenuIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const UNIVERSAL_SKILLS_SHOWCASE = [
  {
    key: "clarity",
    name: "Clarity",
    score: "86",
    tagline: "Direct & Unambiguous",
    description:
      "Expressing propositions clearly without vague corporate jargon, unnecessary hedges, or ambiguous commitments.",
    colorAccent: "bg-primary text-primary-foreground",
  },
  {
    key: "assertiveness",
    name: "Assertiveness",
    score: "82",
    tagline: "Firm Boundaries",
    description:
      "Advocating for your interests, holding professional ground, and handling counter-arguments without passivity or aggression.",
    colorAccent: "bg-[#d4ff00] text-[#171e00]",
  },
  {
    key: "empathy",
    name: "Empathy",
    score: "88",
    tagline: "Perspective Taking",
    description:
      "Demonstrating active listening and acknowledging counterpart constraints while maintaining your core objectives.",
    colorAccent: "bg-[#ffb3b0] text-[#971e26]",
  },
  {
    key: "structure",
    name: "Structure",
    score: "80",
    tagline: "Logical Framing",
    description:
      "Organizing thoughts with clear premises, structured justifications, and logical conversational sequencing.",
    colorAccent: "bg-primary text-primary-foreground",
  },
  {
    key: "conciseness",
    name: "Conciseness",
    score: "78",
    tagline: "High Signal-to-Noise",
    description:
      "Delivering maximum substance in minimum words, avoiding rambling, circular reasoning, and filler dialogue.",
    colorAccent: "bg-foreground text-background",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Select Scenario & Difficulty",
    description:
      "Choose from 6 curated workplace situations across Easy, Medium, and Hard tiers designed around realistic interpersonal tension.",
  },
  {
    step: "02",
    title: "Simulate Live Dialogue",
    description:
      "Converse naturally using voice or text. The AI persona pushes back with authentic objections, budget constraints, and organizational skepticism.",
  },
  {
    step: "03",
    title: "Deterministic Evaluation",
    description:
      "Post-session rubric evaluates 5 universal skills (70%) and scenario-specific business objectives (30%) with zero arbitrary score inflation.",
  },
  {
    step: "04",
    title: "Turn-Linked Coaching & Retry",
    description:
      "Every coaching recommendation is anchored directly to your actual dialogue turns, with concrete alternative phrasing for your next rehearsal.",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      {/* Ambient Memphis Dot Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-5 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px] z-0"
        aria-hidden="true"
      />

      {/* 1. Public Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-8 py-3.5 bg-surface/85 backdrop-blur-xl border-b border-border shadow-xs">
        <div className="max-w-container-max mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display font-bold tracking-tight text-foreground transition hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground shadow-[2px_2px_0px_0px_#1a1a1a]">
              K
            </span>
            <span className="text-lg font-bold tracking-tight">Kalemny</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            aria-label="Public navigation"
            className="hidden md:flex items-center gap-7 font-meta text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="#scenarios"
              className="hover:text-foreground transition-colors"
            >
              Scenarios
            </a>
            <a
              href="#skills"
              className="hover:text-foreground transition-colors"
            >
              Universal Skills
            </a>
            <a
              href="#coaching"
              className="hover:text-foreground transition-colors"
            >
              Coaching
            </a>
          </nav>

          {/* Nav Actions */}
          <div className="flex items-center gap-3">
            <Show when="signed-in">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[3px_3px_0px_0px_#1a1a1a] brutalist-interactive"
              >
                <span>Enter Simulator</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
              <UserButton />
            </Show>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="hidden sm:inline-flex items-center rounded-control bg-surface px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground border border-border shadow-[2px_2px_0px_0px_#1a1a1a] hover:bg-surface-subtle cursor-pointer"
                >
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[3px_3px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer"
                >
                  <span>Start Free</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </SignUpButton>
            </Show>

            {/* Mobile Menu Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-control border border-border bg-surface shadow-2xs"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden pt-4 pb-3 border-t border-border mt-3 flex flex-col gap-3 font-meta text-xs font-semibold uppercase tracking-wider"
          >
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-muted-foreground hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#scenarios"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-muted-foreground hover:text-foreground"
            >
              Scenarios
            </a>
            <a
              href="#skills"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-muted-foreground hover:text-foreground"
            >
              Universal Skills
            </a>
            <a
              href="#coaching"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-muted-foreground hover:text-foreground"
            >
              Coaching
            </a>
            <div className="pt-2 border-t border-border/40 flex items-center justify-between">
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="text-xs font-bold uppercase text-foreground py-1"
                  >
                    Sign In
                  </button>
                </SignInButton>
              </Show>
              <Link
                href="/app"
                className="text-xs font-bold uppercase text-primary py-1"
              >
                Launch App →
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10 pt-28 sm:pt-32 pb-24 space-y-24 sm:space-y-32">
        {/* 2. Hero Section */}
        <section className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 pt-6 sm:pt-12">
            {/* Left Copy */}
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-primary/20 rounded-full bg-primary/10">
                <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
                  Workplace Communication Simulator
                </span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-foreground leading-[1.1]">
                Master high-stakes workplace conversations.
              </h1>

              <p className="font-sans text-lg sm:text-xl text-muted-foreground leading-relaxed">
                Rehearse salary negotiations, manager disagreements, tough
                feedback, and promotion requests with realistic AI
                counterparts. Receive structured turn-linked coaching to sharpen
                your communication.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Show when="signed-in">
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-8 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[6px_6px_0px_0px_#1a1a1a] brutalist-interactive"
                  >
                    <span>Open Simulator</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </Show>

                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-8 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[6px_6px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer"
                    >
                      <span>Start Free Rehearsal</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </SignUpButton>
                </Show>

                <a
                  href="#scenarios"
                  className="inline-flex items-center justify-center gap-2 rounded-control bg-surface px-6 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-surface-subtle transition-all"
                >
                  Explore 6 Scenarios
                </a>
              </div>

              <div className="pt-4 flex items-center gap-6 font-meta text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-primary" /> Voice & Text
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-primary" /> 5-Skill Rubric
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="w-4 h-4 text-primary" /> Free Instant
                  Feedback
                </span>
              </div>
            </div>

            {/* Right Product Preview Mockup */}
            <div className="w-full max-w-lg relative">
              {/* Memphis decorative geometric shapes */}
              <div
                className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-primary/15 border border-border pointer-events-none z-0"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#d4ff00]/40 border border-border transform rotate-6 pointer-events-none z-0"
                aria-hidden="true"
              />

              {/* Simulation Session Preview Window */}
              <div className="glass-surface rounded-card p-6 border-2 border-border shadow-[8px_8px_0px_0px_#1a1a1a] relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/20 pb-3">
                  <div>
                    <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary block">
                      Live Simulation Preview
                    </span>
                    <h3 className="font-display text-base font-bold uppercase text-foreground">
                      Salary Negotiation · Medium
                    </h3>
                  </div>
                  <span className="font-meta text-xs px-2.5 py-1 rounded-full border border-border bg-[#d4ff00]/30 font-bold text-[#171e00]">
                    Turn 3 / 6
                  </span>
                </div>

                {/* Dialogue Turn Exchange */}
                <div className="space-y-3 font-sans text-xs sm:text-sm">
                  {/* Persona message */}
                  <div className="rounded-control bg-surface-subtle border border-border/40 p-3.5 space-y-1">
                    <div className="font-meta text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Alex Mercer (VP Engineering)
                    </div>
                    <p className="text-foreground/90 leading-relaxed">
                      &quot;I understand market rates are higher, but our engineering
                      budget is strictly capped this quarter. What specific
                      outcomes justify an exception?&quot;
                    </p>
                  </div>

                  {/* Learner response */}
                  <div className="rounded-control bg-primary/10 border-2 border-primary p-3.5 space-y-1 ml-4 shadow-xs">
                    <div className="font-meta text-[10px] font-bold uppercase tracking-wider text-primary">
                      You (Senior Engineer)
                    </div>
                    <p className="text-foreground leading-relaxed">
                      &quot;Over the past year I led the architecture refactor that
                      cut cloud infrastructure spend by 32% and delivered our
                      two major customer milestones ahead of schedule.&quot;
                    </p>
                  </div>
                </div>

                {/* Real-time coaching insight preview */}
                <div className="pt-2 border-t border-border/20 flex items-center justify-between font-meta text-xs">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <TargetIcon className="w-4 h-4" />
                    <span>Evidence-Linked Scoring</span>
                  </div>
                  <span className="font-display font-bold text-foreground">
                    Clarity 86 · Assertiveness 82
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. How It Works Section */}
        <section
          id="how-it-works"
          className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8 space-y-12"
        >
          <div className="space-y-3 max-w-2xl">
            <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
              Structured Methodology
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
              How the simulation loop works
            </h2>
            <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
              Built on deliberate practice principles: realistic pressure,
              objective scoring, and targeted rehearsal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.step}
                className="glass-surface rounded-card p-6 border border-border shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-primary transition-all"
              >
                <div className="font-display text-4xl font-extrabold text-primary/20 group-hover:text-primary transition-colors">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Scenario Showcase Section */}
        <section
          id="scenarios"
          className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8 space-y-12"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/20 pb-4">
            <div className="space-y-2 max-w-2xl">
              <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
                Curated Practice Scenarios
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
                6 Core Workplace Challenges
              </h2>
              <p className="font-sans text-sm sm:text-base text-muted-foreground">
                Calibrated simulations addressing the most critical career and
                teamwork conversations.
              </p>
            </div>

            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 font-meta text-xs font-bold text-primary hover:underline underline-offset-4 shrink-0"
            >
              <span>Explore In Simulator</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {DEFAULT_MOCK_SCENARIOS.map((scenario) => {
              const meta = getScenarioMeta(scenario);

              return (
                <article
                  key={scenario.key}
                  className="glass-surface rounded-card p-6 flex flex-col justify-between border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {meta.categoryLabel}
                      </span>
                      <span className="font-meta text-xs px-2.5 py-0.5 rounded-full border border-border/40 bg-surface-subtle font-semibold text-foreground">
                        {meta.difficulty}
                      </span>
                    </div>

                    <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors mb-2">
                      {scenario.title}
                    </h3>

                    <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-6">
                      {scenario.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border/15 flex items-center justify-between mt-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {meta.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-meta text-[10px] px-2 py-0.5 rounded-full border border-border/30 bg-surface-subtle text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/app/scenarios/${encodeURIComponent(scenario.key)}`}
                      className="shrink-0 inline-flex items-center gap-1 font-meta text-xs font-bold text-primary group-hover:underline underline-offset-4 ml-2"
                    >
                      <span>Practice</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 5. Five Universal Communication Skills Section */}
        <section
          id="skills"
          className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8 space-y-12"
        >
          <div className="space-y-3 max-w-2xl">
            <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
              The Communication Framework
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
              5 Universal Competencies
            </h2>
            <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
              Every conversation is scored across 5 foundational communication
              pillars providing an objective blueprint for personal growth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {UNIVERSAL_SKILLS_SHOWCASE.map((skill) => (
              <div
                key={skill.key}
                className="glass-surface rounded-card p-6 border border-border shadow-[4px_4px_0px_0px_#1a1a1a] flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-meta text-xs uppercase tracking-wider font-bold text-foreground">
                      {skill.name}
                    </span>
                    <span
                      className={cn(
                        "font-meta text-[11px] font-bold px-2 py-0.5 rounded-full border border-border",
                        skill.colorAccent,
                      )}
                    >
                      {skill.score}/100
                    </span>
                  </div>

                  <span className="font-meta text-[11px] text-primary font-semibold block mb-2">
                    {skill.tagline}
                  </span>

                  <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-border/20">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${skill.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Coaching & Turn-Linked Results Preview */}
        <section
          id="coaching"
          className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8 space-y-12"
        >
          <div className="space-y-3 max-w-2xl">
            <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
              Turn-Linked Coaching
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
              Feedback that references real words
            </h2>
            <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
              No generic platitudes. Antigravity analysis links directly to your
              exact conversational inputs with actionable alternatives.
            </p>
          </div>

          <div className="glass-surface rounded-card p-6 sm:p-8 md:p-10 border-2 border-border shadow-[8px_8px_0px_0px_#1a1a1a] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-display font-bold text-xs">
                  ★
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
                  Moments That Mattered · Coaching Breakdown
                </h3>
              </div>
              <span className="font-meta text-xs text-muted-foreground font-semibold">
                Objective: Advocate for Market Compensation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Actual Quote & Critique */}
              <div className="space-y-3 p-5 rounded-card bg-surface border border-border">
                <span className="font-meta text-xs uppercase font-bold text-alert flex items-center gap-1.5">
                  Your Response (Turn 4) · Opportunity to Strengthen
                </span>
                <blockquote className="font-sans text-sm italic text-foreground/90 border-l-2 border-border pl-3 py-1">
                  &quot;I guess I feel like I&apos;ve been doing a lot of extra work
                  lately and hoping we could adjust my pay accordingly.&quot;
                </blockquote>
                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  <strong>Coach Analysis:</strong> Using passive qualifiers (&quot;I
                  guess I feel like&quot;) diminishes the impact of your
                  accomplishments and invites postponement from your manager.
                </p>
              </div>

              {/* Stronger Alternative */}
              <div className="space-y-3 p-5 rounded-card bg-primary/10 border-2 border-primary">
                <span className="font-meta text-xs uppercase font-bold text-primary flex items-center gap-1.5">
                  Recommended Stronger Alternative
                </span>
                <blockquote className="font-sans text-sm font-medium text-foreground border-l-2 border-primary pl-3 py-1">
                  &quot;Based on leading the recent cloud migration that saved 32%
                  in operational costs and expanding my scope across two teams,
                  I am requesting a base salary adjustment to $145,000.&quot;
                </blockquote>
                <p className="font-sans text-xs text-foreground/80 leading-relaxed">
                  <strong>Why this works:</strong> Grounds the request in
                  quantifiable business value and states an explicit,
                  unambiguous figure without defensive hedging.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Final Call to Action (CTA) */}
        <section className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8">
          <div className="glass-surface rounded-card p-8 sm:p-12 md:p-16 border-2 border-border shadow-[8px_8px_0px_0px_#1a1a1a] text-center space-y-6 relative overflow-hidden bg-primary/5">
            <div
              className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#d4ff00]/30 blur-2xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-primary/20 blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
              <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 border border-primary/20 px-3 py-1 rounded-full inline-block">
                Start Practicing Today
              </span>

              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
                Ready to elevate your workplace communication?
              </h2>

              <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
                Take 5 minutes to simulate a difficult conversation. Build
                confidence, master negotiation, and get actionable AI feedback.
              </p>

              <div className="pt-4 flex justify-center">
                <Show when="signed-in">
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-8 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[6px_6px_0px_0px_#1a1a1a] brutalist-interactive"
                  >
                    <span>Launch Simulator</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </Show>

                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-8 py-4 font-display text-sm sm:text-base font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[6px_6px_0px_0px_#1a1a1a] brutalist-interactive cursor-pointer"
                    >
                      <span>Start Your First Simulation</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </SignUpButton>
                </Show>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Footer */}
      <footer className="border-t border-border bg-surface py-12 px-4 sm:px-6 md:px-8">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-control border border-border bg-primary font-display font-extrabold text-primary-foreground shadow-2xs">
              K
            </span>
            <span className="font-display font-bold text-foreground">
              Kalemny
            </span>
            <span className="font-meta text-xs text-muted-foreground ml-2">
              AI Workplace Communication Simulator · Release 1 (English)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-meta text-xs text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
            </a>
            <a href="#scenarios" className="hover:text-foreground">
              Scenarios
            </a>
            <a href="#skills" className="hover:text-foreground">
              Skills
            </a>
            <a href="#coaching" className="hover:text-foreground">
              Coaching
            </a>
            <Link href="/app" className="text-primary font-bold">
              Simulator
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
