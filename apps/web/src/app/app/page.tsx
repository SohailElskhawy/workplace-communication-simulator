import { auth } from "@clerk/nextjs/server";
import type { PublicScenarioSummary } from "@kalemny/contracts";
import Link from "next/link";

import { getWebEnv } from "../../config/env";
import { createApiClient } from "../../lib/api-client";

export const dynamic = "force-dynamic";

export default async function ScenariosPage() {
  const authentication = await auth();

  if (!authentication.isAuthenticated) {
    return authentication.redirectToSignIn();
  }

  const token = await authentication.getToken();
  if (!token) {
    return authentication.redirectToSignIn();
  }

  const webEnv = getWebEnv();
  const client = createApiClient(webEnv.NEXT_PUBLIC_API_URL);

  let scenarios: PublicScenarioSummary[] = [];
  let error: string | null = null;

  try {
    scenarios = await client.fetchScenarios(token);
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to load workplace scenarios.";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-8">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Workplace Simulation Scenarios
        </span>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Choose a Conversation to Practice
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          Rehearse high-stakes workplace dialogues with adaptive AI
          counterparts. Receive objective coaching across 5 core communication
          skills and retry to master your technique.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <p className="font-semibold">Unable to load scenarios</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-slate-600">No active scenarios available.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.key}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    {scenario.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    v{scenario.version}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                  {scenario.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {scenario.summary}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <Link
                  href={`/app/scenarios/${encodeURIComponent(scenario.key)}`}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Start Practice
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
