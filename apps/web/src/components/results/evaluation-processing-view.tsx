"use client";

import { useEffect, useState } from "react";

import { CheckIcon, ShieldCheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface EvaluationProcessingViewProps {
  scenarioTitle: string;
  difficulty: string;
  latestUserTurnText?: string | undefined;
}

export function EvaluationProcessingView({
  scenarioTitle,
  difficulty,
  latestUserTurnText,
}: EvaluationProcessingViewProps) {
  const [cardStep, setCardStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCardStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const stackCards = [
    {
      id: "transcript",
      header: "TRANSCRIPT EXCERPT",
      title: "Recent Conversation Moment",
      content:
        latestUserTurnText ||
        "Based on the scope of the role and the experience I'm bringing, I'd like to explore whether there's flexibility in the compensation.",
      isQuote: true,
    },
    {
      id: "skills",
      header: "UNIVERSAL SKILLS",
      title: "Analyzing Communication Structure",
      content:
        "Evaluating clarity, assertiveness, empathy, structured reasoning, and conciseness across exchanged turns.",
      isQuote: false,
    },
    {
      id: "objectives",
      header: "SCENARIO OBJECTIVES",
      title: "Reviewing Conversation Evidence",
      content:
        "Verifying whether workplace objectives were achieved and assessing responses to counterpart objections.",
      isQuote: false,
    },
    {
      id: "coaching",
      header: "EVIDENCE-BASED COACHING",
      title: "Synthesizing High-Impact Moments",
      content:
        "Highlighting conversation strengths, moments for improvement, and tailored phrasing for future practice.",
      isQuote: false,
    },
  ];

  const layerClasses: Record<number, string> = {
    1: "translate-y-0 scale-100 z-40 opacity-100 bg-white border-2 border-border shadow-[4px_4px_0px_0px_#1a1a1a]",
    2: "translate-y-4 scale-95 z-30 opacity-85 bg-surface-raised/90 border border-border shadow-xs",
    3: "translate-y-8 scale-90 z-20 opacity-65 bg-surface-raised/80 border border-border/80",
    4: "translate-y-12 scale-85 z-10 opacity-40 bg-surface-raised/60 border border-border/60",
  };

  return (
    <div className="w-full pb-16">
      {/* Top Status Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 py-3 rounded-t-card shadow-xs mb-8">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-sm uppercase tracking-tight text-foreground">
            SimuLab AI
          </span>
          <span className="text-border/40 font-meta text-xs">·</span>
          <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {scenarioTitle} · {difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            Evaluating
          </span>
        </div>
      </div>

      {/* Main Grid: Left Status + Right 3D Card Stack */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center px-4 sm:px-6">
        {/* Left Column: Copy & Milestones */}
        <div className="flex flex-col gap-6 relative">
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-primary absolute -top-4 -left-4 -z-10 opacity-70"
          />
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-control bg-[#d4ff00] border border-border rotate-45 absolute top-0 right-8 -z-10 shadow-[2px_2px_0px_0px_#1a1a1a]"
          />
          <div
            aria-hidden="true"
            className="w-10 h-10 rounded-full border-2 border-[#b8373b] absolute -bottom-3 right-2 -z-10 opacity-30"
          />

          <div className="flex flex-col gap-3">
            <span className="font-meta text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Simulation Complete
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15] relative z-10">
              Let&apos;s look at how that went.
            </h1>
            <p className="font-sans text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed">
              We&apos;re reviewing your conversation and preparing
              evidence-based coaching from the moments that mattered.
            </p>
          </div>

          {/* Semantic Deterministic Milestone List */}
          <div className="flex flex-col gap-3.5 mt-2 select-none">
            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full bg-[#d4ff00] border border-border flex items-center justify-center text-[#171e00] shrink-0 shadow-[1px_1px_0px_0px_#1a1a1a]">
                <CheckIcon className="w-3 h-3 stroke-3" />
              </div>
              <span className="font-sans text-sm font-medium text-foreground">
                Conversation complete
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full bg-primary border border-primary flex items-center justify-center shrink-0 shadow-[0_0_0_4px_rgba(0,82,255,0.2)]">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
              <span className="font-sans text-sm font-bold text-foreground">
                Reviewing communication
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full border-2 border-border/30 bg-surface-subtle shrink-0" />
              <span className="font-sans text-sm font-medium text-muted-foreground">
                Connecting feedback to key moments
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 rounded-full border-2 border-border/30 bg-surface-subtle shrink-0" />
              <span className="font-sans text-sm font-medium text-muted-foreground">
                Preparing your coaching
              </span>
            </div>
          </div>

          {/* Skills Preview */}
          <div className="mt-2 pt-4 border-t border-dashed border-border/30">
            <span className="font-meta text-xs uppercase tracking-wider text-muted-foreground block mb-2.5 font-semibold">
              Analyzing Skills
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Clarity",
                "Assertiveness",
                "Empathy",
                "Structure",
                "Conciseness",
              ].map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-surface-subtle rounded-full border border-border/30 font-meta text-xs font-medium text-foreground uppercase tracking-wider shadow-2xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Layered 3D Card Stack */}
        <div className="relative h-90 sm:h-100 w-full flex justify-center items-center perspective-[1000px] select-none">
          <div className="relative w-75 sm:w-85 h-55">
            {stackCards.map((card, i) => {
              const layer = ((i - cardStep + 4) % 4) + 1;
              const isFront = layer === 1;

              return (
                <div
                  key={card.id}
                  className={cn(
                    "absolute inset-0 rounded-card p-5 sm:p-6 flex flex-col justify-between transition-all duration-500 ease-in-out",
                    layerClasses[layer] ?? layerClasses[4],
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-dashed border-border/20 pb-2 mb-3">
                      <span className="font-meta text-[10px] font-bold uppercase tracking-widest text-primary">
                        {card.header}
                      </span>
                      {isFront && (
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <h4 className="font-display text-sm sm:text-base font-bold uppercase tracking-tight text-foreground mb-1.5 line-clamp-1">
                      {card.title}
                    </h4>
                    <p
                      className={cn(
                        "font-sans text-xs sm:text-sm text-foreground/80 leading-relaxed line-clamp-4",
                        card.isQuote && "italic text-foreground font-medium",
                      )}
                    >
                      {card.isQuote ? `"${card.content}"` : card.content}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/10 flex items-center justify-between font-meta text-[10px] text-muted-foreground">
                    <span>SimuLab AI Evaluator</span>
                    <span>Step {((cardStep + i) % 4) + 1}/4</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Reassurance Card */}
      <div className="w-full max-w-4xl mt-12 sm:mt-16 mx-auto px-4">
        <div className="glass-surface p-5 sm:p-6 rounded-card border border-border flex items-start gap-4 mx-auto max-w-md shadow-xs">
          <ShieldCheckIcon className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-tight text-foreground">
              Your conversation is saved.
            </h4>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
              You can safely leave this page and return to your results later
              from your session history.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
