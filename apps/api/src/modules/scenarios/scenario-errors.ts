export type ScenarioErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "PLAN_UPGRADE_REQUIRED"
  | "VALIDATION_FAILED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

const errorDetails: Record<
  ScenarioErrorCode,
  { status: number; message: string }
> = {
  NOT_FOUND: { status: 404, message: "Scenario not found." },
  FORBIDDEN: {
    status: 403,
    message:
      "You do not have permission to perform this action on the scenario.",
  },
  PLAN_UPGRADE_REQUIRED: {
    status: 403,
    message: "Custom interview scenarios require a Plus or Pro plan.",
  },
  VALIDATION_FAILED: {
    status: 400,
    message: "Invalid scenario inputs or unsupported document.",
  },
  AI_TIMEOUT: {
    status: 504,
    message: "AI scenario generation timed out. Please try again.",
  },
  AI_PROVIDER_ERROR: {
    status: 502,
    message: "AI scenario generation failed. Please try again.",
  },
  INTERNAL_ERROR: {
    status: 500,
    message: "An unexpected error occurred while creating the scenario.",
  },
};

export class ScenarioError extends Error {
  readonly code: ScenarioErrorCode;
  readonly status: number;

  constructor(code: ScenarioErrorCode, customMessage?: string) {
    const details = errorDetails[code];
    super(customMessage ?? details.message);
    this.name = "ScenarioError";
    this.code = code;
    this.status = details.status;
  }
}
