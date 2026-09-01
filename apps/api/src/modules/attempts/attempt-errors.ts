export type AttemptErrorCode =
  | "NOT_FOUND"
  | "INVALID_ATTEMPT_STATE"
  | "SESSION_LIMIT_REACHED"
  | "TURN_ALREADY_PENDING"
  | "REALTIME_TRANSCRIPT_PENDING"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "TRANSCRIPTION_FAILED"
  | "TTS_FAILED"
  | "EVALUATION_FAILED"
  | "EVALUATION_IN_PROGRESS";

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
  REALTIME_TRANSCRIPT_PENDING: {
    status: 409,
    message:
      "Your live conversation transcript is still being saved. Please try again shortly.",
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
  TTS_FAILED: {
    status: 502,
    message: "Speech playback is unavailable. The text remains available.",
  },
  EVALUATION_FAILED: {
    status: 500,
    message: "The evaluation could not be completed.",
  },
  EVALUATION_IN_PROGRESS: {
    status: 409,
    message: "An evaluation is already in progress. Please try again shortly.",
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
