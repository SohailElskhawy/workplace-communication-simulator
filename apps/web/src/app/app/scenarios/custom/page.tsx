"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowLeftIcon, SparklesIcon } from "@/components/icons";
import { CustomInterviewWizard } from "@/components/scenarios/custom-interview-wizard";
import { createApiClient } from "@/lib/api-client";

export default function CustomScenarioPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [userPlan, setUserPlan] = useState<"FREE" | "PLUS" | "PRO">("FREE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadUserPlan() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }
      try {
        const token = await getToken();
        if (!token) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const client = createApiClient(apiUrl);
        const me = await client.fetchMe(token);
        if (mounted) {
          setUserPlan(me.entitlement.effectivePlan);
        }
      } catch {
        // graceful fallback to default
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUserPlan();
    return () => {
      mounted = false;
    };
  }, [getToken, isLoaded, isSignedIn]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 font-sans pb-24">
      {/* 1. Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb navigation"
        className="flex items-center gap-2"
      >
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 font-meta text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          <span>All Scenarios</span>
        </Link>
        <span className="text-border/40 font-meta text-xs">/</span>
        <span className="font-meta text-xs uppercase tracking-widest text-primary font-bold">
          Custom Interview
        </span>
      </nav>

      {/* 2. Header Intro */}
      <header className="space-y-3 border-b border-border/15 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-meta text-xs font-bold uppercase tracking-wider">
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Tailored Rehearsal</span>
        </div>

        <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-foreground leading-[1.15]">
          Create Custom Interview
        </h1>

        <p className="font-sans text-base sm:text-lg text-muted-foreground leading-relaxed">
          Upload your CV and paste your target job description. Our AI creates
          an owner-scoped, realistic interview simulation grounded exclusively
          in your real achievements and candidate background.
        </p>
      </header>

      {/* 3. Interactive Wizard Card */}
      <div className="glass-surface rounded-card border-2 border-border p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
        {loading ? (
          <div className="py-12 text-center font-meta text-xs text-muted-foreground animate-pulse">
            Loading configuration...
          </div>
        ) : (
          <CustomInterviewWizard userEffectivePlan={userPlan} />
        )}
      </div>
    </div>
  );
}
