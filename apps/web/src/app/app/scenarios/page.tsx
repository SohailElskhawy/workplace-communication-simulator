"use client";

import { useAuth } from "@clerk/nextjs";
import type { PublicScenarioSummary } from "@kalemny/contracts";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api-client";
import {
  DEFAULT_MOCK_SCENARIOS,
  ScenarioLibraryView,
} from "../scenario-library-view";

export default function ScenariosPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [scenarios, setScenarios] = useState<PublicScenarioSummary[]>(
    DEFAULT_MOCK_SCENARIOS,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  useEffect(() => {
    let isMounted = true;

    async function loadScenarios() {
      if (!isLoaded || !isSignedIn) return;
      try {
        const token = await getToken();
        if (!token) return;

        const client = createApiClient(apiUrl);
        const data = await client.fetchScenarios(token);
        if (!isMounted) return;
        setScenarios(data);
        setErrorMessage(null);
      } catch (err) {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Could not fetch updated scenarios.",
        );
      }
    }

    void loadScenarios();

    return () => {
      isMounted = false;
    };
  }, [apiUrl, getToken, isLoaded, isSignedIn]);

  return (
    <ScenarioLibraryView
      initialScenarios={scenarios}
      errorMessage={errorMessage}
    />
  );
}
