"use client";

import { SignIn } from "@clerk/nextjs";

import {
  AuthPanelShell,
  CLERK_NEO_BRUTALIST_APPEARANCE,
} from "@/components/auth-panel-shell";

export default function SignInPage() {
  return (
    <AuthPanelShell mode="sign-in">
      <SignIn
        appearance={CLERK_NEO_BRUTALIST_APPEARANCE}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/app"
      />
    </AuthPanelShell>
  );
}
