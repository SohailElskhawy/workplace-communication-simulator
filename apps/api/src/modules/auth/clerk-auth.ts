import { clerkMiddleware, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";

export interface ClerkAuthOptions {
  publishableKey?: string;
  secretKey?: string;
}

export function createClerkAuthenticationMiddleware(
  options?: ClerkAuthOptions,
): RequestHandler {
  return clerkMiddleware(options);
}

export function resolveClerkUserId(request: Request): string | null {
  const auth = getAuth(request);

  return auth.isAuthenticated && auth.userId ? auth.userId : null;
}
