import { auth } from "@clerk/nextjs/server";
import type { PublicScenarioSummary } from "@kalemny/contracts";

import { getWebEnv } from "../../config/env";
import { createApiClient } from "../../lib/api-client";
import { ScenarioLibraryView } from "./scenario-library-view";

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
    <ScenarioLibraryView
      initialScenarios={scenarios}
      errorMessage={error}
    />
  );
}
