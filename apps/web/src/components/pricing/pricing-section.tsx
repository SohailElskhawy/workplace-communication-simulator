"use client";

import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import {
  formatWhatsAppUrl,
  PRICING_PLANS,
  WHATSAPP_PHONE_NUMBER,
} from "@/lib/pricing-config";

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="max-w-container-max mx-auto px-4 sm:px-6 md:px-8 space-y-12"
    >
      {/* Section Header */}
      <div className="space-y-3 max-w-2xl">
        <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
          Transparent Pricing
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-foreground">
          Invest in your workplace impact
        </h2>
        <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
          Start for free with weekly simulation quota. Upgrade your plan
          directly via WhatsApp when you need more rehearsal volume.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const isPaid = Boolean(plan.whatsappMessage);
          const whatsappUrl = plan.whatsappMessage
            ? formatWhatsAppUrl(WHATSAPP_PHONE_NUMBER, plan.whatsappMessage)
            : "";

          return (
            <div
              key={plan.id}
              className={cn(
                "glass-surface rounded-card p-6 sm:p-8 flex flex-col justify-between border-2 transition-all duration-200 relative",
                plan.popular
                  ? "border-primary shadow-[8px_8px_0px_0px_#1a1a1a] bg-primary/5 lg:-translate-y-2 z-10"
                  : "border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1",
              )}
            >
              {/* Card Top / Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span
                      className={cn(
                        "font-meta text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-border shadow-2xs",
                        plan.badgeColor ?? "bg-surface text-foreground",
                      )}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="font-sans text-xs sm:text-sm text-muted-foreground min-h-10 leading-relaxed">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="pt-2 border-t border-border/20">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                      {plan.price}
                    </span>
                    {plan.billingPeriod && (
                      <span className="font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {plan.billingPeriod}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 font-meta text-xs font-semibold text-primary">
                    {plan.simulationsText}
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div className="pt-4 border-t border-border/20 space-y-3">
                  <span className="font-meta text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    What&apos;s included
                  </span>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 font-sans text-xs sm:text-sm text-foreground/90 leading-snug"
                      >
                        <CheckIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card CTA Actions */}
              <div className="pt-8 mt-auto border-t border-border/15">
                {isPaid ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-control px-6 py-3.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider border brutalist-interactive w-full text-center transition-all",
                      plan.popular
                        ? "bg-primary text-primary-foreground border-border shadow-[4px_4px_0px_0px_#1a1a1a]"
                        : "bg-surface text-foreground border-border shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-surface-subtle",
                    )}
                  >
                    <span>{plan.ctaLabel}</span>
                    <ArrowRightIcon className="w-4 h-4 shrink-0" />
                  </a>
                ) : (
                  <>
                    <Show when="signed-in">
                      <Link
                        href="/app"
                        className="inline-flex items-center justify-center gap-2 rounded-control bg-surface px-6 py-3.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground border-2 border-border shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-surface-subtle brutalist-interactive w-full text-center"
                      >
                        <span>Open Simulator</span>
                        <ArrowRightIcon className="w-4 h-4 shrink-0" />
                      </Link>
                    </Show>

                    <Show when="signed-out">
                      <SignUpButton mode="modal">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-control bg-surface px-6 py-3.5 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground border-2 border-border shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-surface-subtle brutalist-interactive w-full text-center cursor-pointer"
                        >
                          <span>{plan.ctaLabel}</span>
                          <ArrowRightIcon className="w-4 h-4 shrink-0" />
                        </button>
                      </SignUpButton>
                    </Show>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Activation Note */}
      <div className="text-center pt-2">
        <p className="font-meta text-xs text-muted-foreground">
          Questions or custom requirements? Chat with us directly on WhatsApp at{" "}
          <a
            href={`https://wa.me/905528509969`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-bold hover:underline underline-offset-4"
          >
            {WHATSAPP_PHONE_NUMBER}
          </a>
        </p>
      </div>
    </section>
  );
}
