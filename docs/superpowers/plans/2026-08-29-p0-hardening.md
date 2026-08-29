# Milestone 13 P0 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the release-blocking production hardening required to move the complete Release 1 core loop from Development into Testing.

**Architecture:** Add small API infrastructure modules for safe errors, request telemetry, throttling, and monitoring, then wire them through the existing Express composition root without changing domain contracts. Add Next.js monitoring and shared route-state/accessibility primitives, audit each existing P0 screen in place, and verify AI accounting through the existing `AiUsageEvent` persistence model.

**Tech Stack:** pnpm workspaces, TypeScript, Express 5, Next.js 16, React 19, Zod, Prisma, Vitest, Supertest, Pino, Helmet, express-rate-limit, Sentry.

**Spec:** `docs/superpowers/specs/2026-08-29-p0-hardening-design.md`

## Global Constraints

- Release 1 remains English-only and no new product features are permitted.
- Do not change attempt lifecycle, deterministic scoring, immutable scenarios, REST success DTOs, or the single `OpenRouterProvider` architecture.
- Do not add Redis, queues, microservices, billing, or a separate analytics platform.
- Never log or send to Sentry prompts, transcripts, learner/assistant text, audio, authorization values, cookies, secrets, request bodies, query values, or upstream payloads.
- Raw microphone and TTS audio remain memory-only and TTS failure remains non-blocking.
- Existing user-owned Milestone 12 changes must not be reverted or included in unrelated commits.
- Tests are written alongside implementation, not with TDD, per `AGENTS.md`.

---

### Task 1: Production Dependencies and Validated Configuration

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env.example`
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/src/config/env.test.ts`
- Modify: `apps/web/src/config/env.ts`
- Modify: `apps/web/src/config/env.test.ts`

**Interfaces:**
- Produces: validated API fields `GENERAL_RATE_LIMIT_WINDOW_MS`, `GENERAL_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_MS`, `AI_RATE_LIMIT_MAX`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, and optional `SENTRY_RELEASE`.
- Produces: optional web fields `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, and `NEXT_PUBLIC_SENTRY_RELEASE`.
- Preserves: the four operation-specific timeout variables, each positive and capped at `120_000` milliseconds.

- [ ] Install `helmet`, `express-rate-limit`, `pino`, `@sentry/node`, and `@sentry/nextjs` in the owning workspace packages using pnpm.
- [ ] Extend both Zod environment schemas with optional Sentry configuration and bounded positive rate-limit/timeout values.
- [ ] Document safe production defaults and optional monitoring variables in `.env.example` without adding real credentials.
- [ ] Add parsing tests for defaults, valid overrides, invalid ceilings, and absent Sentry DSNs.
- [ ] Run `corepack pnpm --filter @kalemny/api typecheck` and the API/web environment tests.

### Task 2: Stable Errors, Request IDs, and Privacy-Safe Logging

**Files:**
- Create: `apps/api/src/infrastructure/logging/logger.ts`
- Create: `apps/api/src/infrastructure/logging/logger.test.ts`
- Create: `apps/api/src/middleware/request-context.ts`
- Create: `apps/api/src/middleware/request-context.test.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/src/middleware/error-handler.test.ts`
- Modify: `packages/contracts/src/error.ts`
- Modify: `apps/api/src/modules/common/route-helpers.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Produces: `AppLogger` with allowlisted `info`, `warn`, and `error` metadata rather than raw request/error serialization.
- Produces: `requestContext(logger): RequestHandler` assigning `response.locals.requestId`, `X-Request-Id`, and completion telemetry.
- Produces: `notFoundHandler` and `createErrorHandler({ logger, captureException })` returning `ApiErrorResponse`.
- Preserves: existing public domain error codes/status mappings; adds `RATE_LIMITED` only for throttling.

- [ ] Implement a Pino wrapper whose accepted metadata type excludes headers, bodies, messages, prompts, and audio.
- [ ] Implement request IDs, normalized path-only route telemetry, status, and latency without serializing Express request/response objects.
- [ ] Extract malformed JSON, oversized payload, unknown-route, and unexpected-error serialization into final middleware.
- [ ] Replace `console.log`/`console.error` startup and fallback logging with the injected safe logger.
- [ ] Add tests proving stable response bodies and request IDs, and proving representative authorization, transcript, prompt, body, and query content never reaches log output.
- [ ] Run API app, middleware, logger, contract, typecheck, and lint checks.

### Task 3: Security Headers and General/AI Rate Limiting

**Files:**
- Create: `apps/api/src/middleware/rate-limits.ts`
- Create: `apps/api/src/middleware/rate-limits.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/server.ts`
- Modify: route registration files under `apps/api/src/modules/{attempts,evaluations,voice,tts}` only where an expensive-operation limiter must be attached precisely.

**Interfaces:**
- Produces: `createGeneralRateLimiter(options): RequestHandler`.
- Produces: `createAiRateLimiter(options): RequestHandler`.
- Both return `429` with `{ error: { code: "RATE_LIMITED", message, requestId } }`, standard headers, and `Retry-After`.

- [ ] Add Helmet to the API with JSON/API-appropriate settings while preserving strict CORS.
- [ ] Implement a general `/api/v1` limiter and a separate limiter shared only by roleplay creation/retry, evaluation, transcription, and TTS mutations.
- [ ] Key authenticated traffic from trusted Clerk identity when resolved and otherwise use the framework IP fallback; never use authorization values as keys.
- [ ] Add isolated limiter instances to test general and expensive-route thresholds without test cross-contamination.
- [ ] Verify health behavior, success below threshold, rejection above threshold, stable safe errors, and no effect on unrelated routes.
- [ ] Run focused API tests, typecheck, and lint.

### Task 4: Sentry Integration With Mandatory Scrubbing

**Files:**
- Create: `apps/api/src/infrastructure/monitoring/sentry.ts`
- Create: `apps/api/src/infrastructure/monitoring/sentry.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/sentry.edge.config.ts`
- Create: `apps/web/src/instrumentation-client.ts`
- Create: `apps/web/src/instrumentation.ts`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/src/app/global-error.tsx`
- Modify/Create: `apps/web/src/app/error.tsx`
- Create: `apps/web/src/lib/sentry-scrub.ts`
- Create: `apps/web/src/lib/sentry-scrub.test.ts`

**Interfaces:**
- Produces: `initializeApiMonitoring(config)` returning a safe `captureException(error, context)` callback or a no-op when DSN is absent.
- Produces: shared `scrubSentryEvent(event)` removing request data, headers, cookies, query strings, breadcrumbs/content, and sensitive extras.

- [ ] Implement deterministic event scrubbing first as a pure function shared by the monitoring configuration.
- [ ] Initialize backend monitoring only when configured, disable PII, and pass only safe request ID/route/error-code tags from the centralized handler.
- [ ] Configure supported Next.js server, edge, and client initialization with absent-DSN no-op behavior and source-map upload controlled by standard Sentry configuration.
- [ ] Add accessible global/route error boundaries with retry/navigation recovery and no internal diagnostics beyond safe request IDs.
- [ ] Test disabled behavior and scrubbing against bodies, headers, cookies, query values, transcript-like extras, breadcrumbs, and exception values.
- [ ] Run API/web monitoring tests, typecheck, lint, and a production web build.

### Task 5: Complete AI Usage and Cost Accounting

**Files:**
- Modify as required: `apps/api/src/modules/ai/openrouter-provider.ts`
- Modify as required: `apps/api/src/modules/attempts/attempt-service.ts`
- Modify as required: `apps/api/src/modules/evaluations/evaluation-service.ts`
- Modify as required: `apps/api/src/modules/voice/voice-service.ts`
- Modify as required: `apps/api/src/modules/tts/tts-service.ts`
- Modify as required: the corresponding repositories and tests under those modules.
- Create: `apps/api/src/modules/ai/ai-usage-summary.ts`
- Create: `apps/api/src/modules/ai/ai-usage-summary.test.ts`

**Interfaces:**
- Preserves: `AiUsageEvent` fields and Prisma schema without adding billing data.
- Produces: pure internal `summarizeAiUsage(events)` proving totals by operation and completed attempt can be calculated from stored safe metadata; it is not exposed as a new endpoint.

- [ ] Audit all four operation success/failure paths against provider, explicit model, latency, tokens, audio duration, estimated cost, and sanitized error-code requirements.
- [ ] Close only demonstrated persistence gaps; keep missing upstream token/cost values as `null` rather than inventing prices.
- [ ] Ensure timeout and malformed-provider failures persist a safe code and never persist upstream response/error content.
- [ ] Add a pure aggregation utility and tests for per-operation and per-attempt total cost from existing decimal-compatible values.
- [ ] Extend service/repository tests for each corrected success/failure path and privacy invariant.
- [ ] Run all AI, attempt, evaluation, voice, and TTS tests plus API typecheck/lint.

### Task 6: Shared Accessible Route States and Responsive Shell

**Files:**
- Create: `apps/web/src/components/route-state.tsx`
- Create: `apps/web/src/components/accessible-dialog.tsx`
- Create: `apps/web/src/components/accessible-dialog.test.tsx` only if the existing test environment supports DOM interaction; otherwise cover pure focus/key helpers.
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/app/layout.tsx`
- Modify: `apps/web/src/components/app-header.tsx`
- Create: `apps/web/src/app/app/loading.tsx`
- Create: `apps/web/src/app/app/error.tsx`
- Create: `apps/web/src/app/app/not-found.tsx`

**Interfaces:**
- Produces: `LoadingState`, `EmptyState`, and `ErrorState` components with semantic live regions and recovery actions.
- Produces: `AccessibleDialog` with `role="dialog"`, `aria-modal`, label/description IDs, initial focus, Escape close, focus containment, and focus restoration.

- [ ] Add global visible focus styling, reduced-motion handling, overflow protection, and readable wrapping for user/AI content.
- [ ] Make the authenticated shell/header usable at narrow widths with all three destinations retained and touch targets at least 44 CSS pixels where practical.
- [ ] Implement shared semantic route states and segment fallbacks.
- [ ] Implement the accessible dialog without adding a general component framework; verify keyboard behavior with the strongest supported test level.
- [ ] Run web typecheck, lint, tests, and build.

### Task 7: P0 Screen State and Accessibility Audit

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`
- Modify: `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `apps/web/src/app/app/page.tsx`
- Modify: `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx`
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.tsx`
- Modify: `apps/web/src/app/app/results/[attemptId]/page.tsx`
- Modify: `apps/web/src/app/app/history/page.tsx`
- Modify: `apps/web/src/app/app/progress/page.tsx`
- Modify: `apps/web/src/components/speech-button.tsx`
- Modify: `apps/web/src/hooks/use-voice-recorder.ts` only if the audit finds an announcement/fallback defect.
- Modify/Create: focused web tests for changed state/error helpers and API error mapping.

**Interfaces:**
- Consumes: shared route states and accessible dialog from Task 6.
- Preserves: all existing API client methods and product actions.

- [ ] Audit each route at narrow mobile, tablet, and desktop widths; fix overflow, cramped controls, long text wrapping, and stacked action layout defects in place.
- [ ] Add or correct landmarks, heading order, control labels, form associations, focus styles, live status/error regions, `aria-busy`, and decorative-icon hiding.
- [ ] Replace results/history delete overlays with the accessible dialog and preserve safe destructive confirmation semantics.
- [ ] Ensure every read state has loading, valid empty, unauthorized/not-found, recoverable error, and retry/navigation behavior as applicable.
- [ ] Ensure each mutation prevents duplicate activation, announces progress/failure, preserves composer text after roleplay errors, and maintains text fallback after STT/TTS errors.
- [ ] Add focused non-brittle tests for state selection and error-code recovery decisions.
- [ ] Run the complete web test, typecheck, lint, and build suite.

### Task 8: Full Verification, Core-Loop Smoke Test, and Project State

**Files:**
- Modify: `docs/PROJECT_STATE.md`
- Modify: test fixtures/scripts only if needed to run an existing in-scope smoke path; do not add a new testing framework.

**Interfaces:**
- Produces: fresh verification evidence and an honest Development-to-Testing transition decision.

- [ ] Run `corepack pnpm typecheck` and record the result.
- [ ] Run `corepack pnpm lint` and `corepack pnpm format:check` and correct only Milestone 13 or directly overlapping formatting defects.
- [ ] Run `corepack pnpm test` and record total test/file counts.
- [ ] Run `corepack pnpm build` and `corepack pnpm prisma:validate`.
- [ ] Start the API/web with validated local configuration and smoke-test authentication, scenario selection, attempt creation, a text turn, finish/evaluation, persisted results, retry, history, and progress. If external credentials/services are unavailable, run the strongest integration substitute and explicitly name the external boundary that remains unverified.
- [ ] Verify representative 429, timeout, unexpected-error, missing-data, and optional-Sentry-disabled paths without exposing sensitive content.
- [ ] Update `PROJECT_STATE.md` with implemented hardening, exact verification evidence, smoke-test status, unresolved issues, and transition to Testing only when the Milestone 13 exit criteria are genuinely satisfied.
- [ ] Review `git diff` and `git status` to ensure no user-owned Milestone 12 work was reverted or accidentally bundled.
