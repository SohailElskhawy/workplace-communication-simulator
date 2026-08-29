export type AttemptErrorCode =
  | "NOT_FOUND"
  | "INVALID_ATTEMPT_STATE"
  | "SESSION_LIMIT_REACHED"
  | "TURN_ALREADY_PENDING"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "TRANSCRIPTION_FAILED"
  | "EVALUATION_FAILED";

const errorDetails: Record<
  AttemptErrorCode,
  { status: number; message: string }
> = {
  NOT_FOUND: { status: 404, message: "Attempt or scenario not found." },
  INVALID_ATTEMPT_STATE: {
    status: 409,
    message: "Attempt does not accept new turns in its current state.",
  },
  SESSION_LIMIT_REACHED: {
    status: 409,
    message: "Session limit reached. Finish the attempt to continue.",
  },
  TURN_ALREADY_PENDING: {
    status: 409,
    message: "Another turn is already pending.",
  },
  AI_TIMEOUT: {
    status: 504,
    message: "The roleplay response timed out. Retry this turn.",
  },
  AI_PROVIDER_ERROR: {
    status: 502,
    message: "The roleplay response could not be generated. Retry this turn.",
  },
  TRANSCRIPTION_FAILED: {
    status: 502,
    message: "Transcription failed. You can continue with text.",
  },
  EVALUATION_FAILED: {
    status: 500,
    message: "The evaluation could not be completed.",
  },
};

export class AttemptError extends Error {
  readonly code: AttemptErrorCode;
  readonly status: number;

  constructor(code: AttemptErrorCode, customMessage?: string) {
    const details = errorDetails[code];
    super(customMessage ?? details.message);
    this.name = "AttemptError";
    this.code = code;
    this.status = details.status;
  }
}
