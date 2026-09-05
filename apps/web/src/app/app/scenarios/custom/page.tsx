"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowLeftIcon } from "@/components/icons";
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
    <div
      className="mx-auto w-full max-w-4xl space-y-10 pb-20 pt-8 sm:pt-12"
      data-od-id="interview-prep-screen"
    >
      <nav
        aria-label="Breadcrumb navigation"
        className="flex items-center gap-2"
      >
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="directional-icon h-4 w-4" />
          <span>Practice library</span>
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm font-semibold text-foreground">
          Interview prep
        </span>
      </nav>

      <header
        className="max-w-3xl space-y-4"
        data-od-id="interview-prep-heading"
      >
        <p className="text-sm font-semibold text-primary">
          Prepare for your real interview
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Turn the role you want into a practice conversation.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Add your CV and the job description. Kalemny creates a personalized
          interview grounded in the experience and requirements you provide.
        </p>
      </header>

      <ol
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Interview preparation steps"
      >
        {[
          { number: "1", title: "Upload your CV", detail: "PDF, up to 5MB" },
          {
            number: "2",
            title: "Add the job description",
            detail: "Role and requirements",
          },
          {
            number: "3",
            title: "Practice your interview",
            detail: "Personalized questions",
          },
        ].map(({ number, title, detail }) => (
          <li
            key={number}
            className="rounded-card border border-border-subtle bg-surface-solid p-4"
          >
            <span className="font-mono text-xs font-semibold text-primary">
              {number.padStart(2, "0")}
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </li>
        ))}
      </ol>

      <section
        className="rounded-card border border-border-subtle bg-surface-solid p-5 shadow-xs sm:p-8"
        data-od-id="interview-prep-wizard"
      >
        {loading ? (
          <div className="animate-pulse py-12 text-center text-sm text-muted-foreground">
            Preparing your interview workspace…
          </div>
        ) : (
          <CustomInterviewWizard userEffectivePlan={userPlan} />
        )}
      </section>
    </div>
  );
}
