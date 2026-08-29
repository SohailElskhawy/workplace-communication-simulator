export type AttemptErrorCode =
  | "NOT_FOUND"
  | "INVALID_ATTEMPT_STATE"
  | "SESSION_LIMIT_REACHED"
  | "TURN_ALREADY_PENDING";

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
};

export class AttemptError extends Error {
  readonly code: AttemptErrorCode;
  readonly status: number;

  constructor(code: AttemptErrorCode) {
    const details = errorDetails[code];
    super(details.message);
    this.name = "AttemptError";
    this.code = code;
    this.status = details.status;
  }
}
