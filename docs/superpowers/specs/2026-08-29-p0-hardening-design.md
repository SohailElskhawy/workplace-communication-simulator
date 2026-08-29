# Milestone 13 P0 Hardening Design

## Scope

Milestone 13 hardens the completed Release 1 product without changing its feature set, REST contracts, domain lifecycle, scoring, scenario behavior, or approved provider architecture. Work is limited to responsive and accessibility defects, complete user-facing loading/empty/error recovery, centralized API errors, rate limiting, validated timeout configuration, privacy-safe structured logging, Sentry exception monitoring, and complete AI usage/cost metadata.

The implementation follows `PROJECT_STATE.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, `API_CONTRACT.md`, and `AI_DESIGN.md`. Existing uncommitted Milestone 12 scenario work is treated as user-owned and must not be reverted or reformatted unnecessarily. No new product feature, infrastructure service, queue, cache, analytics product, or billing system is introduced.

## Production Dependency Baseline

Use narrowly scoped, established packages for production concerns that are unsafe to recreate under deadline pressure:

- `helmet` for standard Express security headers;
- `express-rate-limit` for process-local Release 1 request throttling;
- `pino` for structured JSON application logging;
- `@sentry/node` for backend exception monitoring;
- `@sentry/nextjs` for Next.js server, edge, and browser exception monitoring.

The process-local limiter is intentionally sufficient for the approved single API service MVP. It does not add Redis or distributed rate-limit infrastructure. Package versions are locked through the existing pnpm lockfile.

## API Request Boundary and Centralized Errors

The Express application assigns or preserves a safe request ID at the start of every request and returns it through an `X-Request-Id` response header. A small common error module owns stable application-error detection and response serialization. Existing module-specific domain errors retain their current status codes and public error codes; malformed JSON and oversized bodies remain validation failures; unknown routes return a stable `NOT_FOUND`; unexpected errors return `INTERNAL_ERROR` without stack traces or internal messages.

The final error middleware is the only fallback serializer for thrown errors. Route modules may continue mapping expected service errors when that keeps module ownership clear, but they use shared helpers rather than duplicating response shapes. Rate-limit rejections use a stable `RATE_LIMITED` application code and include the request ID. Shared contracts are extended only if a new stable error-code literal is required; successful endpoint DTOs do not change.

## Rate Limits and Security Headers

Apply a configurable general authenticated API limit and stricter limits to expensive AI mutations: roleplay turn creation/retry, evaluation generation, transcription, and TTS. Health checks remain lightweight and available. Limits use the authenticated provider identity when available and a safe IP fallback before authentication; raw authorization headers and learner content are never used as keys or logged.

Environment configuration validates positive integer windows and request ceilings. Defaults are conservative enough for normal use, the 20-turn session ceiling, retries, and accessibility tools while blocking obvious abuse. `Retry-After` and standard rate-limit headers are exposed. Tests verify independent expensive-route enforcement and the stable safe error response.

Helmet is enabled with settings compatible with the separate Vercel web and Railway API origins. Existing strict CORS and body limits remain authoritative. No content security policy is added to the API response boundary if it provides no value for JSON/audio endpoints.

## Timeout Configuration

The existing operation-specific variables remain the sole AI timeout controls:

```text
ROLEPLAY_TIMEOUT_MS=15000
EVALUATION_TIMEOUT_MS=30000
TRANSCRIPTION_TIMEOUT_MS=20000
TTS_TIMEOUT_MS=15000
```

Validation adds reasonable upper bounds so deployment mistakes cannot create unbounded requests. Each OpenRouter operation must use its own configured value and abort safely. Tests cover parsing, wiring, and sanitized timeout errors. There is no generic retry for roleplay, STT, or TTS; evaluation keeps only its already approved retry policy.

## Privacy-Safe Structured Logging

Pino emits structured JSON records containing only allowlisted operational metadata: event name, level, timestamp, request ID, method, normalized route, status, latency, sanitized error code, and safe internal attempt/user identifiers only when explicitly supplied. Request and response bodies, query values, prompts, transcript text, AI replies, raw/generated audio, cookies, authorization headers, API keys, and full URLs are never logged.

HTTP completion logging is implemented explicitly rather than by serializing Express request/response objects. Unexpected exceptions are logged by type and safe code without arbitrary exception messages or stacks in standard logs. Startup and graceful-shutdown messages also use the logger. Tests inject a logger sink and assert both useful metadata and absence of representative secrets/transcript content.

## Sentry Monitoring and Scrubbing

Sentry initializes only when its server or public web DSN is configured. Missing DSNs are valid in local development and tests. Backend capture receives unexpected exceptions after sensitive data has been stripped. Frontend capture covers uncaught rendering/runtime failures through the supported Next.js integration and route-level error boundaries.

Both SDKs disable default personally identifiable information collection and apply `beforeSend` scrubbing. Events must not include request bodies, headers, cookies, query strings, learner messages, transcripts, prompts, AI replies, audio, or secrets. Safe tags may include environment, release, request ID, route template, operation, and sanitized application error code. Sentry failure must never break a request or UI recovery path.

## AI Usage and Cost Accounting

The existing `AiUsageEvent` table remains the accounting source of truth. All four operations—`ROLEPLAY`, `EVALUATION`, `TRANSCRIPTION`, and `TTS`—record provider, explicit model, success/failure, latency, available input/output tokens, audio duration where applicable, OpenRouter-reported estimated cost where available, and a sanitized error code. No prompt, transcript, response, or audio content is added.

The milestone audits success and failure paths for gaps, especially failures that occur before canonical persistence and optional OpenRouter usage fields. Cost is stored as the existing decimal value returned by the provider; the application does not invent a pricing catalog or billing subsystem. Repository-level aggregation tests demonstrate that stored events can support approximate per-operation and per-completed-simulation totals without adding a user-facing analytics feature.

## Responsive and Accessibility Hardening

Audit every Release 1 route: landing/auth, scenario list, scenario detail, simulation, results, history, and progress. The target is usable layouts at narrow mobile widths through desktop, with no horizontal overflow, clipped actions, unreadable transcript content, or unreachable controls. Header navigation adapts at small widths without hiding core destinations.

Accessibility fundamentals include semantic landmarks and headings, descriptive link/button names, visible keyboard focus, keyboard-operable dialogs and transcript controls, correctly associated form labels, live status/error announcements, `aria-busy` for long operations, disabled-state semantics, sufficient touch targets, and decorative glyphs hidden from assistive technology. The delete confirmation behaves as an accessible modal with an accessible name, focus placement, Escape/cancel behavior, and focus restoration. Color is not the only carrier of score, objective, recording, or error state.

Motion remains minimal and respects `prefers-reduced-motion`. Voice continues to have a complete text fallback. The audit changes presentation and interaction semantics only; it does not redesign the approved product or introduce a component library.

## Loading, Empty, Unauthorized, and Error Recovery

Every data route renders a meaningful loading state, a valid empty state where the API permits one, an authentication/authorization outcome, and a recoverable error state. Retry controls repeat only safe reads or approved idempotent operations. Mutation controls expose progress, prevent duplicate activation, preserve learner input on roleplay failure, and keep text available after STT/TTS failure.

Next.js segment-level `loading.tsx`, `error.tsx`, and `not-found.tsx` files provide final route/render coverage, while domain pages retain specific recovery actions such as retry evaluation, retry assistant generation, reload history/progress, or return to scenarios. Errors show safe application messages and request IDs when useful; they never expose stack traces or upstream payloads.

## Testing and Release Verification

Tests are written alongside implementation rather than through TDD, as required by `AGENTS.md`. Coverage focuses on error serialization, request IDs, rate-limit behavior, environment bounds, log redaction, Sentry scrubbing/disabled behavior, complete AI usage metadata, and important accessible UI states without brittle visual snapshots or AI-prose assertions.

Completion requires fresh successful runs of:

```text
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm prisma:validate
```

The core loop is smoke-tested from authentication through scenario selection, attempt creation, text turn, finish, evaluation, persisted results, retry, and history/progress visibility. When live Clerk, Neon, or OpenRouter credentials prevent a genuine local/staging smoke test, the implementation uses the strongest available route/service integration test and reports the exact unverified boundary rather than claiming success.

`PROJECT_STATE.md` is updated after verification with Milestone 13 scope, commands and test counts, smoke-test evidence, known limitations, and the formal transition from Development to Testing only if all exit criteria are genuinely met and there are no known release-blocking defects.
