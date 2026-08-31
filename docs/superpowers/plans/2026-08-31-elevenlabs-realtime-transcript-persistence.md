# ElevenLabs Realtime Transcript Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist canonical, finalized ElevenLabs realtime transcripts as idempotent VOICE conversation turns.

**Architecture:** An authenticated binding endpoint maps the SDK conversation ID to an owned attempt. A public raw-body webhook authenticates ElevenLabs before parsing, validates only the canonical post-call transcript shape, resolves the mapping privately, and transactionally appends normalized turns with deterministic IDs. The existing preparation migration supplies the only new persistence model.

**Tech Stack:** Express, TypeScript, Zod, Prisma/PostgreSQL, Node `crypto`, Vitest/Supertest, Next.js, ElevenLabs React SDK.

**Spec:** User-approved conversation design, 2026-08-31.

## Global Constraints

- Use finalized `post_call_transcription` data only; never consume live UI events for persistence.
- Never log webhook body, transcript, message text, prompt, audio, context token, or signature.
- Do not store raw webhook payloads or audio; do not enable/consume `post_call_audio`.
- Preserve stored attempt variation, difficulty, and scenario version; do not trigger evaluation.
- Existing TEXT and push-to-talk behavior remains unchanged.
- `FAILED` unmatched learner turns preserve text but remain excluded from the existing completed-only evaluation transcript.

---

### Task 1: Binding contract and authenticated ownership boundary

**Files:**
- Modify: `packages/contracts/src/realtime.ts`, `packages/contracts/src/index.ts`
- Modify: `apps/api/src/modules/realtime/realtime-routes.ts`
- Modify: `apps/api/src/modules/realtime/realtime-service.ts`
- Modify: `apps/api/src/modules/attempts/attempt-service.ts`, `apps/api/src/modules/attempts/prisma-attempt-repository.ts`
- Modify: `apps/web/src/lib/api-client.ts`, `apps/web/src/components/simulations/live-conversation.tsx`
- Test: `packages/contracts/src/realtime.test.ts`, `apps/api/src/modules/realtime/realtime-routes.test.ts`, `apps/api/src/modules/realtime/realtime-service.test.ts`

**Interfaces:**
- Produces `POST /api/v1/attempts/:attemptId/realtime-conversation` accepting `{ conversationId }` and returning the bound IDs.
- Produces `RealtimeVoiceService.bindConversation(userId, attemptId, conversationId)`.

- [ ] Add route/service/repository tests covering owned ACTIVE binding, repeated same-attempt binding, and foreign/conflicting IDs.
- [ ] Add `bindRealtimeConversation` repository method using an attempt-owner lock and a unique conversation ID constraint; same binding returns success, a different owner/attempt resolves safely as not found.
- [ ] Register the Clerk-authenticated route with shared request/response Zod contracts.
- [ ] Add API-client binding and await `startSession()` in the frontend; bind the returned ID immediately, ending the just-started session and reporting an error if binding fails.
- [ ] Run focused realtime contract, service, and route tests.

### Task 2: Signed webhook authentication and normalized import service

**Files:**
- Create: `apps/api/src/modules/realtime/elevenlabs-webhook.ts`
- Create: `apps/api/src/modules/realtime/realtime-transcript-service.ts`
- Modify: `apps/api/src/modules/realtime/realtime-routes.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`
- Modify: `apps/api/src/modules/attempts/prisma-attempt-repository.ts`
- Test: `apps/api/src/modules/realtime/elevenlabs-webhook.test.ts`, `apps/api/src/modules/realtime/realtime-transcript-service.test.ts`, `apps/api/src/modules/realtime/realtime-routes.test.ts`

**Interfaces:**
- Produces `verifyElevenLabsWebhookSignature({ rawBody, signature, secret, currentTime })`.
- Produces `normalizeElevenLabsTranscript(transcript)` and `RealtimeTranscriptService.importTranscript(event)`.

- [ ] Add raw-body HMAC tests for valid, invalid, malformed, and stale `t=<unix>,v0=<hex>` signatures using constant-time comparison.
- [ ] Add backend-only Zod schemas for exactly `post_call_transcription`, its agent/conversation IDs, and transcript entries.
- [ ] Normalize transcript order: ignore blank/tool-only entries and initial agent opener; pair a learner entry with its following agent entry; emit a final unmatched learner entry as `FAILED`/`null` assistant text.
- [ ] Add a transactionally idempotent Prisma import: resolve only `RealtimeConversation`, lock its attempt, continue from `max(sequence)`, and create deterministic `realtime:<conversationId>:<position>` VOICE records.
- [ ] Register the public webhook before global JSON parsing/auth, receive a bounded raw body, verify before parsing, require the configured agent ID, and always reply 2xx for unknown IDs or completed duplicate delivery.
- [ ] Run focused signature, transcript service, and route tests for wrong agent, unknown mapping, duplicate delivery, opening exclusion, pairing, interruptions, final unmatched learner, continuation, and retry deduplication.

### Task 3: Documentation, migration validation, and full verification

**Files:**
- Modify: `docs/API_CONTRACT.md`, `docs/DATABASE_DESIGN.md`, `docs/PROJECT_STATE.md`, `.env.example`
- Validate: `prisma/schema.prisma`, `prisma/migrations/20260831120000_add_realtime_conversation/migration.sql`

- [ ] Document the owner-only binding endpoint, public webhook route, HMAC freshness behavior, canonical transcript rules, 2xx privacy-safe behavior, and no-audio policy.
- [ ] Reconcile project state from presentation-only realtime to canonical post-call transcript persistence, including operational configuration `ELEVENLABS_WEBHOOK_SECRET`.
- [ ] Validate Prisma schema/client generation and run focused tests.
- [ ] Run workspace typechecks, lint, and the complete test suite; report exact command outcomes and any external staging setup still required.
