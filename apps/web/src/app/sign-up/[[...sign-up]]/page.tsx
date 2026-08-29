"use client";

import { SignUp } from "@clerk/nextjs";

import {
  AuthPanelShell,
  CLERK_NEO_BRUTALIST_APPEARANCE,
} from "@/components/auth-panel-shell";

export default function SignUpPage() {
  return (
    <AuthPanelShell mode="sign-up">
      <SignUp
        appearance={CLERK_NEO_BRUTALIST_APPEARANCE}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/app"
      />
    </AuthPanelShell>
  );
}
