import { MeResponseSchema } from "@kalemny/contracts";
import { auth } from "@clerk/nextjs/server";

import { getWebEnv } from "../../config/env";

export const dynamic = "force-dynamic";

export default async function AuthenticatedAppPage() {
  const authentication = await auth();

  if (!authentication.isAuthenticated) {
    return authentication.redirectToSignIn();
  }

  const token = await authentication.getToken();
  if (!token) {
    return authentication.redirectToSignIn();
  }

  const webEnv = getWebEnv();
  const response = await fetch(`${webEnv.NEXT_PUBLIC_API_URL}/api/v1/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load the authenticated user.");
  }

  const me = MeResponseSchema.parse(await response.json());

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <p>Authenticated local user: {me.data.id}</p>
    </main>
  );
}
