import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed token that lets the ElevenLabs agent fetch the hidden
 * scenario context for exactly one attempt. The token is an HMAC-SHA256
 * signed payload bound to the attempt and local user; it carries no hidden
 * scenario data itself and expires quickly.
 */
export const REALTIME_CONTEXT_TOKEN_TTL_MS = 10 * 60 * 1000;

interface ContextTokenPayload {
  attemptId: string;
  userId: string;
  /** Expiry as unix seconds. */
  exp: number;
}

function sign(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

/**
 * Constant-time comparison for shared secrets such as the ElevenLabs tool
 * secret header. Safe for inputs of different lengths.
 */
export function secretsMatch(left: string, right: string): boolean {
  if (left.length === 0 || right.length === 0) {
    return false;
  }
  return safeEqual(sign(left, "kalemny"), sign(right, "kalemny"));
}

export interface SignContextTokenInput {
  secret: string;
  attemptId: string;
  userId: string;
  currentTime: Date;
  ttlMs?: number;
}

export function signContextToken(input: SignContextTokenInput): {
  token: string;
  expiresAt: Date;
} {
  const ttlMs = input.ttlMs ?? REALTIME_CONTEXT_TOKEN_TTL_MS;
  const expiresAt = new Date(input.currentTime.getTime() + ttlMs);
  const payload: ContextTokenPayload = {
    attemptId: input.attemptId,
    userId: input.userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return {
    token: `${encodedPayload}.${sign(input.secret, encodedPayload)}`,
    expiresAt,
  };
}

export interface VerifiedContextToken {
  attemptId: string;
  userId: string;
}

/**
 * Verifies signature and expiry. Returns null for any malformed, tampered,
 * or expired token instead of throwing, so callers can map failures to a
 * safe 404 without leaking why the token was rejected.
 */
export function verifyContextToken(input: {
  secret: string;
  token: string;
  currentTime: Date;
}): VerifiedContextToken | null {
  const separatorIndex = input.token.lastIndexOf(".");
  if (separatorIndex <= 0) {
    return null;
  }

  const encodedPayload = input.token.slice(0, separatorIndex);
  const signature = input.token.slice(separatorIndex + 1);
  if (!safeEqual(sign(input.secret, encodedPayload), signature)) {
    return null;
  }

  let payload: ContextTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as ContextTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.attemptId !== "string" ||
    payload.attemptId.length === 0 ||
    typeof payload.userId !== "string" ||
    payload.userId.length === 0 ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    return null;
  }

  if (payload.exp * 1000 <= input.currentTime.getTime()) {
    return null;
  }

  return { attemptId: payload.attemptId, userId: payload.userId };
}
