import type { ApiErrorResponse } from "@kalemny/contracts";
import type { Request, Response } from "express";

import { AttemptError } from "../attempts/attempt-errors.js";
import type { LocalUserProvisioner } from "../users/provision-local-user.js";

export interface AuthenticatedRouteDependencies {
  resolveAuthProviderUserId(request: Request): string | null;
  userProvisioner: LocalUserProvisioner;
}

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      requestId: response.locals.requestId as string,
    },
  };
  response.status(status).json(body);
}

export async function resolveLocalUserId(
  request: Request,
  response: Response,
  dependencies: AuthenticatedRouteDependencies,
): Promise<string | null> {
  const authProviderUserId = dependencies.resolveAuthProviderUserId(request);

  if (!authProviderUserId) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication is required.");
    return null;
  }

  const user =
    await dependencies.userProvisioner.ensureUser(authProviderUserId);
  return user.id;
}

export function handleAttemptError(
  response: Response,
  error: unknown,
): boolean {
  if (!(error instanceof AttemptError)) {
    return false;
  }

  sendError(response, error.status, error.code, error.message);
  return true;
}
