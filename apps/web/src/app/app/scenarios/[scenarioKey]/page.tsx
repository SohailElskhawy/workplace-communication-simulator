"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ScenarioRedirectPage() {
  const params = useParams();
  const router = useRouter();

  const rawKey = params?.scenarioKey;
  const scenarioKey =
    (Array.isArray(rawKey) ? rawKey[0] : (rawKey as string | undefined)) ?? "";

  useEffect(() => {
    if (scenarioKey) {
      router.replace(`/app?scenario=${encodeURIComponent(scenarioKey)}`);
    } else {
      router.replace("/app");
    }
  }, [router, scenarioKey]);

  return (
    <div
      role="status"
      aria-label="Redirecting..."
      className="flex min-h-[50vh] items-center justify-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="sr-only">Redirecting to scenario briefing...</span>
    </div>
  );
}
