import { ApiClientError } from "./api-client";

export function isPersistedRoleplayFailure(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.code === "AI_TIMEOUT" || error.code === "AI_PROVIDER_ERROR")
  );
}
