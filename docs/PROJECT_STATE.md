# PROJECT_STATE.md

## Project

**AI Workplace Communication Simulator**

A production-quality web application for students and early-career professionals to practice difficult workplace conversations with adaptive AI, receive structured coaching, retry, and track communication improvement.

**Deadline:** September 3, 2026  
**Current SDLC Phase:** Development

---

## SDLC Status

- Planning — approved
- Analysis — approved
- Design — approved
- Development — active
- Testing — not started
- Deployment — not started
- Monitoring — not started

Do not reopen approved product or architecture decisions unless a concrete blocker threatens the deadline or core loop.

---

## Release 1 Goal

Deliver the complete loop:

**Scenario → Simulation → Evaluation → Evidence-linked coaching → Retry → Progress**

Release 1 is **English-only**.

Primary users:
- university students entering professional environments;
- early-career professionals.

---

## Release 1 Scenarios

1. Salary negotiation
2. Behavioral job interview
3. Promotion request
4. Push back / disagree with manager
5. Difficult feedback to teammate
6. Scope creep / saying no professionally

Scenarios are curated, versioned, and immutable once used.

---

## Core Evaluation Model

Universal skills:

- Clarity
- Assertiveness
- Empathy
- Structure
- Conciseness

Each skill is scored **0–100**.

Scenario objectives use:

- Achieved
- Partially Achieved
- Missed

Overall score:

`70% universal skill average + 30% scenario objective score`

Progress uses the learner's **latest five eligible completed sessions**.

A session contributes to progress only after at least **3 substantive user turns**.

---

## Approved Architecture

### Repository
- pnpm monorepo
- `apps/web`
- `apps/api`
- `packages/contracts`
- `prisma`
- `docs`

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- MediaRecorder for push-to-talk

### Backend
- Node.js
- Express.js
- TypeScript
- Zod
- REST

### Data
- PostgreSQL
- Neon
- Prisma ORM

### Authentication
- Clerk
- lazy local User provisioning

### AI
- OpenRouter behind internal `AiService`
- single Release 1 provider: `OpenRouterProvider`
- no automatic model routing or multi-provider orchestration

Roleplay, evaluation, transcription, and TTS model choices come from environment
configuration. Configured model IDs and operation timeouts remain adjustable.

Preferred Release 1 model candidates:

- roleplay: `deepseek/deepseek-v4-flash-0731`;
- evaluation: `openai/gpt-5.6-luna-pro`, pending Milestone 6 calibration;
- transcription: `openai/whisper-large-v3-turbo`;
- TTS: `hexgrad/kokoro-82m`.

The approved business rule is quality per dollar by operation: aggressively
cost-optimize high-volume roleplay, spend more where evaluation quality affects
trust, use adequate low-cost editable transcription, and keep TTS optional and
usage-controlled. Model decisions must consider privacy and measured cost per
completed simulation, not benchmark rank or token price alone.

### Deployment
- Next.js → Vercel
- Express API → Railway
- PostgreSQL → Neon

---

## Core Domain Entities

- User
- Scenario
- SimulationAttempt
- ConversationTurn
- Evaluation
- AiUsageEvent

Important rules:

- retries create new attempts;
- historical attempts are immutable;
- one learner input maps to one `ConversationTurn`;
- learner text survives AI failure;
- turn creation is idempotent;
- evaluation is independent from roleplay generation;
- frontend never calculates authoritative scores;
- raw microphone audio is not permanently stored;
- TTS audio is not permanently stored;
- transcripts are never written to normal application logs.

---

## Session Lifecycle

`ACTIVE → EVALUATING → COMPLETED`

Other states:

- `EVALUATION_FAILED`
- `ABANDONED`

Limits:

- max 20 user turns
- approx. 15-minute simulation
- max 120 seconds per voice recording

Text and microphone input remain available in the same session.

Voice flow:

`Record → Transcribe → editable composer → Send`

TTS is optional and must never block text conversation.

---

## Release 1 Non-Goals

Do not implement:

- Arabic or other languages
- custom scenarios
- realtime speech-to-speech
- avatars/video
- multiplayer
- teams/enterprise features
- billing
- community/social features
- advanced gamification
- live-meeting analysis
- browser extensions
- queues/workers
- Redis
- microservices
- object storage
- LLM token streaming

---

## Security / Privacy Invariants

- browser never talks directly to OpenRouter or any upstream AI provider;
- browser never supplies authoritative user identity;
- hidden scenario configuration never leaves backend;
- users may access only their own sessions/evaluations;
- no secrets in frontend code;
- no transcripts in standard logs;
- no raw audio persistence;
- prefer OpenRouter Zero Data Retention-compatible routing/providers where available;
- AI calls have explicit timeouts;
- expensive AI endpoints are rate-limited;
- structured AI output is runtime-validated.

---

## Current Development Milestone

**Milestone 13 — P0 Hardening** implementation is complete. The API now has centralized safe fallback errors, request IDs, structured privacy-safe logging, Helmet security headers, configurable process-local general and expensive-AI rate limits, bounded operation-specific timeout configuration, and optional Sentry exception monitoring with mandatory sensitive-event scrubbing. Existing `AiUsageEvent` persistence was audited across roleplay, evaluation, transcription, and TTS; an internal aggregation utility proves that provider-reported costs can be totaled per operation and attempt without billing infrastructure.

September 1 addition — simulation-start interaction mode chooser: the voice path is now chosen once at simulation start and persisted on the attempt. `POST /api/v1/attempts` accepts an optional `interactionMode` (`PUSH_TO_TALK` default, `REALTIME`), stored in a new `SimulationAttempt.interactionMode` column (migration `20260901000000_add_interaction_mode`, applied to the dev database) and returned by the attempt create and detail responses; retries carry the source attempt's mode. The scenario setup screen renders an interaction-mode chooser (Push-to-Talk recommended default; Realtime offered only when `NEXT_PUBLIC_ENABLE_REALTIME_VOICE=true`), and the simulation screen initializes only the chosen mode: push-to-talk attempts keep the existing opening-TTS autoplay plus record/transcribe composer and never render the realtime control, while realtime attempts render only the live conversation control and suppress stored-turn TTS autoplay so the ElevenLabs agent speaks the opening message exactly once when the session connects (manual transcript replay remains available and the auto-play header toggle is hidden in realtime mode). A persisted `REALTIME` attempt falls back to push-to-talk when the build-time flag is disabled, so an attempt is never stranded without a voice path. Text, STT, TTS, evaluation, scoring, and canonical realtime transcript import are unchanged; no voice system was redesigned. Verified with 416 tests across 67 files, strict typecheck, clean lint, Prettier on touched files, Prisma validate/generate, and the migration applied to the dev database.

September 1 defect fix — realtime transcript never imported, finish permanently blocked (empty transcript): finishing a realtime (live voice) attempt could never create a result because `finishAttempt` hard-blocks with `REALTIME_TRANSCRIPT_PENDING` while any bound `RealtimeConversation` has `transcriptImportedAt IS NULL`, and the canonical transcript arrived only through the asynchronous ElevenLabs `post_call_transcription` webhook. If that webhook never arrived — webhook URL not configured on the agent or pointing at an unreachable (non-public) URL, `ELEVENLABS_WEBHOOK_SECRET` missing/mismatched, agent-ID mismatch silently ignored, or plain delivery delay — the transcript was never imported and the attempt could never finish. Fix: finish is now self-healing. `ElevenLabsProvider.fetchConversationTranscript` pulls the finalized transcript server-side from `GET /v1/convai/conversations/:conversation_id` (explicit 10s timeout, resolves `null` on any failure, never throws); a new `realtime-transcript-sync-service` imports each pending bound conversation through the exact same normalization and transactionally idempotent repository import as the webhook (deterministic `realtime:<conversationId>:<position>` IDs make webhook-vs-pull races safe), enforcing the same configured-agent check; `attempt-service.finish` performs one best-effort sync on a `REALTIME_TRANSCRIPT_PENDING` rejection and retries finish once, keeping the 409 (and the webhook) as the safe fallback when recovery cannot finalize. Network calls never run inside DB transactions, no transcript text is logged, and the configured agent ID still gates imports. Text/push-to-talk, evaluation, scoring, and contracts are unchanged. Operational note: the ElevenLabs agent's post-call webhook URL must still point at a public API URL (tunnel in development) with a matching `ELEVENLABS_WEBHOOK_SECRET`; the pull now covers missed deliveries. Verified with 430 tests across 68 files (including new provider, sync-service, finish-recovery, and repository tests), strict typecheck, and clean lint.

September 1 defect fix — realtime bind 500 (schema drift): the first authenticated realtime test failed with a privacy-safe 500 (`INTERNAL_ERROR`) on `POST /api/v1/attempts/:attemptId/realtime-conversation`. Root cause: `transcriptImportedAt` had been amended into the already-applied `20260831120000_add_realtime_conversation` migration, so databases that applied it earlier never received the column. Every `RealtimeConversation` write that returns all scalar fields then failed with Prisma `P2022` (the bind endpoint and the post-call webhook import were both affected), while `prisma migrate status` still reported the database up to date because it only compares recorded migrations, not actual schema. A repair migration `20260901020000_add_realtime_transcript_imported_at` (`ADD COLUMN IF NOT EXISTS`, safe on fresh databases) was applied to the dev database; `prisma migrate diff` against the schema is now empty and the bind transaction was re-verified against the real database with a rolled-back diagnostic (owner lock, uniqueness check, insert, clean rollback). Lesson: never amend an applied migration — always add a new one; use `prisma migrate diff` (not `migrate status`) to detect schema drift. The accompanying `error reading from signal stream` browser log was the known benign livekit teardown log, triggered here because the failed bind made the web client end the session.

August 30 addition (second pass): the realtime spike's shutdown flow and live transcript were fixed. Root cause of the `error reading from signal stream` console error on End: the React SDK's `endSession()` is fire-and-forget (it optimistically clears provider state and swallows the underlying teardown promise), the app fired it from two unguarded places (End button plus the page-disabled effect), and no `onDisconnect` handling existed, so the app treated the end click as synchronous while the WebRTC teardown (and the underlying livekit-client signal-socket read loop race that logs that error) was still in flight. Every end request now converges on one guarded `requestEnd()` that awaits the raw conversation's `endSession()` promise (falling back to the SDK path while a start is still pending), the SDK `onDisconnect` callback is the authoritative cleanup point that releases the end-in-flight guard, the `ConversationProvider` stays mounted until disconnect, and privacy-safe development-only diagnostics log status changes, SDK error messages, and disconnect reasons (never transcripts, tokens, or prompts); unrelated SDK errors still surface in the UI banner. The spike also renders a live ephemeral transcript: the SDK `onMessage` callback consumes finalized `user_transcript` and `agent_response` events into deduplicated in-memory entries (pure helper in `live-conversation-state.ts`, capped at 200), cleared when a new live session starts, and rendered in the conversation stage in place of the single latest message. It remains UI-only; canonical persistence uses the signed post-call webhook rather than these frontend events.

August 30 addition: the backend bootstrap for ElevenLabs realtime voice is in place (server-only ElevenLabs settings, authenticated realtime-session issuance with ownership/ACTIVE validation, short-lived WebRTC + signed context tokens, and a tool-secret-protected scenario-context endpoint that resolves the attempt's stored variation, difficulty, and scenario version server-side). A feature-flagged frontend spike now consumes it on the simulation screen: `@elevenlabs/react` is installed and the new `LiveConversation` control (shown only when `NEXT_PUBLIC_ENABLE_REALTIME_VOICE=true`) wraps the SDK `ConversationProvider`, uses the granular hooks (`useConversationControls`, `useConversationStatus`, `useConversationMode`, `useConversationInput`), and on start requests microphone permission, calls `POST /api/v1/attempts/:attemptId/realtime-session`, and starts ElevenLabs WebRTC with the returned `conversationToken` plus only the public dynamic variables `opening_message` and `secret__kalemny_context_token` — persona/objective/variation/difficulty internals never cross the browser boundary. The control exposes disconnected/connecting/listening/speaking/error states, mutes and ends cleanly (including forced end on finish, expiry, or turn limit), reuses the existing conversation orb and banner patterns, and gates the text/push-to-talk composer while active. It now immediately binds its SDK-created conversation ID to the owner attempt; canonical finalized transcript persistence occurs only via the signed post-call webhook and its `RealtimeConversation` migration. Text, STT, TTS, evaluation, and deterministic scoring remain unchanged.

The August 29 audit follow-up hardened the remaining AI boundaries without starting UI work: evaluation requests now take an atomic database claim before invoking the provider, canonical evaluation results are idempotent, and failed claims are released for retry. Evaluation validation rejects duplicate objective results, keeping deterministic objective weighting intact. Voice duration is parsed from the in-memory media buffer using `music-metadata` and enforced at 120 seconds independently of browser metadata; raw audio remains unpersisted. OpenRouter transcription now carries the same ZDR/data-collection routing policy as other AI operations. Roleplay/evaluation input and output budgets are bounded, evaluator output schemas cap persisted content, and the evaluator treats transcript text as untrusted evidence rather than instructions. A migration adds `evaluationClaimedAt` to `SimulationAttempt`.

The web application now has optional scrubbed Sentry integration, global and authenticated-segment error/loading/not-found coverage, shared accessible route states, visible keyboard focus, reduced-motion behavior, responsive navigation and simulation layouts, semantic live error/progress announcements, and keyboard/focus-safe destructive confirmation dialogs. Voice continues to retain a complete text fallback.

A follow-up conversation-mode fix made the composer input mode (`VOICE`/`TEXT`) a persistent page-level state independent of transient conversation state: once the learner selects VOICE it stays active across recording, transcription, review, send, AI thinking/speaking, and the next turn, and switches to TEXT only via the explicit "Type instead" action. The REVIEWING state keeps a one-click "Record again" microphone action, and the LISTENING microphone button now scales and pulses with the existing live microphone level (no extra stream or analyser, suppressed under `prefers-reduced-motion`). Per-turn `inputMethod` is derived from whether the sent draft originated from a voice transcript; STT/TTS/API/domain behavior is unchanged.

Verified on August 29, 2026 with:

```text
268 tests across 49 test files passing
API, web, and contracts strict TypeScript checks
API and web ESLint checks
repository Prettier and diff checks
Prisma Client generation and schema validation
API/contracts production TypeScript builds
Next.js 16 production build for all Release 1 routes
78 focused core-loop route/service integration smoke tests
```

The authenticated live staging smoke test is not yet verified because the local web environment has no configured Clerk publishable key. Clerk, Neon, OpenRouter, and deployed Sentry behavior therefore remain staging-environment verification boundaries. Do not move formally from Development to Testing until the authenticated staging loop—scenario selection, text turn, finish/evaluation, results, retry, history, and progress—passes with deployed credentials.

No known release-blocking code defect remains from the Milestone 13 implementation.

### Prior milestone: Remaining Scenarios

**Milestone 12 — Remaining Scenarios** is complete. All six curated Release 1 scenarios now have backend-only, Zod-validated, immutable version 1 definitions synchronized through the existing Prisma seed path. Behavioral Interview, Promotion Request, Manager Pushback, Difficult Teammate Feedback, and Scope Creep / Saying No each include distinct public context, persona, motivations, constraints, opening message, four stable evaluation objectives, skill emphasis, and Easy / Medium / Hard behavior across the five approved difficulty axes.

The existing generic loop was verified for every scenario and difficulty: attempt creation exposes the correct opening message, text turns route the authoritative scenario and difficulty to roleplay, finish freezes the attempt for evaluation, evaluation prompts contain only the active scenario version's objective IDs, and immutable synchronization remains idempotent. Deterministic progress recommendations now use the expanded curated scenario catalog.

Verified on August 29, 2026 with:

```text
247 tests across 41 test files passing
API, web, and contracts TypeScript checks
API, web, and contracts lint checks
repository-wide Prettier check
```

### Prior milestone: Optional TTS

**Milestone 11 — Optional TTS** is complete. Stored assistant replies are synthesized on demand through the authenticated API and existing OpenRouter/AiService architecture, played from temporary browser object URLs, and discarded without audio persistence. TTS failure remains isolated from conversation state and text interaction.

### Prior milestone: Push-to-Talk STT

**Milestone 10 — Push-to-Talk STT** is complete. Browser MediaRecorder push-to-talk audio capture, microphone permission and error handling, memory-only audio parsing with zero audio persistence, OpenRouter Whisper transcription integration, editable composer insertion, and reliable text fallback are fully implemented and verified end-to-end.

Completed Push-to-Talk STT features:

- Shared Transcription Contracts (`packages/contracts`):
  - `TranscriptionDataSchema`, `TranscriptionResponseSchema`, `TranscriptionData`, and `TranscriptionResponse`.
- Audio & Voice Validation Rules (`apps/api`):
  - Supported audio MIME types (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/m4a`, `audio/wav`, `audio/mpeg`, `audio/flac`, `video/webm`, `video/mp4` with codec parameter handling);
  - Strict 120-second recording duration ceiling (`MAX_RECORDING_DURATION_MS = 120_000`);
  - 25MB payload ceiling and non-empty audio buffer enforcement.
- OpenRouter Transcription Provider (`apps/api`):
  - `transcribeAudio` calling OpenRouter `/api/v1/audio/transcriptions` with multipart `FormData` and candidate model `openai/whisper-large-v3-turbo`;
  - Explicit abort timeout control (`AI_TIMEOUT`) and safe error mapping (`TRANSCRIPTION_FAILED`, 502);
  - Invariant compliance: zero raw audio persistence to disk or database; telemetry recorded via `AiUsageEvent` with `AiOperation.TRANSCRIPTION`.
- Voice Module & Endpoint (`apps/api`):
  - `POST /api/v1/attempts/:attemptId/transcriptions` using `multer.memoryStorage()` for in-memory multipart parsing;
  - Attempt ownership check (returns 404 for nonexistent/non-owned attempts) and `ACTIVE` state validation (returns 409 for finished/abandoned attempts);
  - Transcription does NOT create a `ConversationTurn`; it returns `{ data: { transcript: "..." } }`.
- Frontend Voice Recording & Composer Integration (`apps/web`):
  - `useVoiceRecorder` custom hook managing lifecycle, streams, timers, and permissions (`idle`, `requesting_permission`, `recording`, `transcribing`, `error`);
  - Automatic stream cleanup releasing microphone tracks immediately upon stop, cancel, or unmount;
  - Live recording countdown/duration bar (`00:15 / 02:00`) with automatic stop and transcription at 120 seconds;
  - Clear diagnostic permission error handling (`NotAllowedError`, `NotFoundError`, etc.) with non-intrusive dismissable notification;
  - Editable Composer integration: transcript populates/appends to textarea, focuses the input, and tracks `inputMethod: "VOICE"` when submitted;
  - Reliable text fallback: text input remains completely functional and unblocked at all times regardless of microphone availability or errors.
- Comprehensive Unit & Integration Tests:
  - 197 tests across 39 test files passing cleanly.

Verified on August 29, 2026 with:

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm prisma:validate
corepack pnpm prisma:generate
```

---

## Immediate Development Order

1. Repository/workspace foundation (Complete)
2. Next.js + Express + shared contracts (Complete)
3. Environment validation (Complete)
4. Clerk authentication (Complete)
5. Prisma + Neon database foundation (Complete)
6. Salary Negotiation scenario v1 (Complete)
7. Attempt/session lifecycle (Complete)
8. Text roleplay (Complete)
9. Structured evaluation + Zod validation (Complete)
10. Deterministic 70/30 scoring (Complete)
11. Results experience (Complete)
12. Retry and comparison (Milestone 8 - Complete)
13. Session history and progress profile (Milestone 9 - Complete)
14. Voice input / Push-to-talk transcription (Milestone 10 - Complete)
15. Text-to-Speech audio generation / Playback (Milestone 11 - Complete)
16. Remaining curated scenarios (Milestone 12 - Complete)
17. P0 production hardening (Milestone 13 - Implementation complete; authenticated staging smoke pending)
18. Frontend Architecture, SOLID, DRY & Modularity Refactoring (Milestone 14 - Complete)
  - Refactored massive monolithic pages (`results/[attemptId]` from 1,662 lines -> 300 lines, `simulations/[attemptId]` from 1,060 lines -> 360 lines, `history` from 703 lines -> 320 lines, `scenarios/[scenarioKey]` from 652 lines -> 220 lines);
  - Decomposed presentational units into 15+ single-responsibility components in `src/components/results/`, `src/components/simulations/`, `src/components/history/`, and `src/components/scenarios/`;
  - Fixed focus trap jitter in `AccessibleDialog` and unmount memory safety in `SpeechButton`;
  - Created centralized domain constants in `src/lib/constants.ts` and unified `useApiQuery` data fetching hook;
  - Added CSS `--container-max: 80rem;` token to fix unconstrained layouts;
  - Fixed WCAG AA accessibility: added skip to main content link, explicit `aria-label` attributes to history inputs/filters, and corrected sectioning semantics;
  - 100% clean typecheck (`tsc --noEmit`), 0 ESLint warnings/errors, and 268 tests passing across 49 test files.
  - August 30 follow-up: refactored the simulation UI from chat-first to conversation-first. The active AI counterpart is now the focal stage; explicit turn, listening, transcription, review, thinking, and speaking states guide the learner; the microphone is primary with an accessible text fallback; and the complete turn history is available in a collapsible transcript drawer. This remains a presentation-only change: REST, attempt lifecycle, transcription review-before-send, and optional TTS behavior are unchanged.
  - August 30 Pass 2: counterpart replies in Conversation Mode now request the existing stored-turn TTS endpoint automatically. Playback moves the stage through `AI_SPEAKING` and back to `YOUR_TURN`; TTS failures remain non-blocking with an inline error. Client-side playback prevents duplicate in-flight requests, stops an active clip before another begins, and revokes temporary object URLs on replacement or unmount. Manual TTS controls remain available in transcript views.
  - August 30 Pass 3A: Conversation Mode now renders a local microphone-level visualizer while recording. The existing MediaRecorder stream is sampled only through a temporary `AudioContext`/`AnalyserNode`; no audio is streamed, persisted, or interpreted for silence detection. The analyser graph, animation frame, media tracks, and reduced-motion listener clean up on stop, cancellation, failure, and unmount. Analysis failure remains non-blocking and text fallback is unchanged.
  - August 30 Pass 3B: Conversation Mode now applies conservative local silence auto-stop using the existing analyser level only after speech has been detected. A simple centralized threshold and 1.8-second silence window stop through the existing transcription and editable-review path; initial silence and brief pauses never stop recording. Detection resets on every new recording and all cleanup paths, and unavailable or unreliable analysis leaves manual Finish Recording and the 120-second cap in control.
  - August 30 focused Conversation Mode QA: learner input is now correctly disabled while counterpart TTS is loading or playing, preventing overlapping turns. The STT → review → send path now preserves `inputMethod: VOICE`, including a failed-send retry, as required by the existing API contract. Automated checks cover playback, microphone level, silence detection, voice fallbacks, API failures, duplicate playback, cleanup, and input gating. An authenticated interactive browser/staging smoke test remains required before the project can move to Testing.
  - August 30 roleplay recovery hardening: provider timeouts and provider-generation failures now reconcile the persisted `FAILED` turn into the simulation UI, open Transcript, and direct the learner to the existing same-turn retry endpoint rather than falsely reporting an unsent message or creating a duplicate turn. The recovery read forces a fresh Clerk token after the long-running provider call. Automatic TTS starts after a zero-delay effect task so React development effect replay cancels the first schedule instead of issuing duplicate opening-speech requests.
  - August 30 evaluation recovery: an attempt in `EVALUATING` now actively starts or recovers its evaluation from the results screen during polling, protected by the API's existing atomic claim. This prevents an interrupted initial browser request from leaving the page polling an unclaimed attempt forever. Conversation-mode autoplay is disabled immediately after Finish is selected, and an already pending browser speech request is aborted, avoiding a post-finish TTS request against a non-playable lifecycle state.
  - August 30 local timeout configuration repair: `.env` templates, setup guidance, and active development copies now match the validated API defaults (`25s` roleplay, `60s` evaluation, `25s` transcription, `15s` TTS). This removes stale `15s` roleplay and `30s` evaluation overrides that caused otherwise recoverable OpenRouter calls to terminate earlier than the current application configuration intended.
  - August 30 scenario variation integration: all six scenarios now ship immutable v2 definitions with curated per-attempt variation pools (v1 rows preserved for historical attempts; v2 synchronized and active in the dev database). Attempt creation selects a variation and persists it as `SimulationAttempt.variationId`, keeping conversation content stable for the attempt; retries exclude the immediately previous variation when the pool allows, and failed-turn retries reuse the same variation. Behavioral Interview uses curated multi-question tracks (3–5 questions across eight competency categories) that roleplay follows flexibly — natural follow-ups, category transitions, no mechanical question dump. Roleplay (`roleplay-v2`) injects the variation opening, hidden counterpart brief, and session plan; evaluation (`evaluation-v2`) receives the effective situation and the actual opening question. Variation selection is deterministic application logic with no extra AI call. Verified with 324 tests across 56 files, strict typecheck/lint, Prisma validation, a real seed/sync (v1 inactive, v2 active), and live OpenRouter smoke tests covering track distribution, follow-ups, transitions, Hard pressure, retry exclusion, and evaluation coherence.
19. ElevenLabs realtime canonical transcript persistence — the SDK-created conversation ID is immediately owner-bound through `POST /api/v1/attempts/:attemptId/realtime-conversation` into the unique `RealtimeConversation` mapping; no browser identity, scenario, variation, difficulty, or transcript is trusted. Binding requires the owned attempt to remain ACTIVE and unexpired. Server-only `ELEVENLABS_WEBHOOK_SECRET` enables public `POST /api/v1/webhooks/elevenlabs`, which verifies the raw-body `ElevenLabs-Signature` HMAC and 30-minute timestamp before Zod parsing only `post_call_transcription`. The configured `agent_id` must match and the attempt resolves only through the stored conversation ID. Unknown IDs, duplicate deliveries, wrong agents, and frozen attempts return private-safe 2xx responses. Finalized transcript entries are normalized transactionally into deterministic-id `VOICE` turns: tool-only/empty entries and the initial agent opening are omitted; learner speech pairs with the following agent reply; an unmatched final learner message persists as `FAILED`/null rather than changing completed-only evaluation assembly. Existing sequences continue, retries cannot duplicate turns, no payload/audio is stored or logged, `post_call_audio` is unused, and import never starts evaluation or alters stored variation/difficulty/version. A mapping receives `transcriptImportedAt` in the import transaction; Finish refuses pending mappings so it cannot evaluate before the asynchronous canonical transcript arrives. Text, PTT, TTS, scoring, and the ephemeral live transcript UI remain intact.
20. August 30 turn-latency optimization (Tier 1): profiling of `POST /attempts/:attemptId/turns` (21.4s observed) attributed the latency almost entirely to the synchronous non-streaming OpenRouter roleplay completion, with secondary DB round-trip overhead. Applied four low-risk fixes with no contract change: (a) the OpenRouter provider now emits `ai_request_completed`/`ai_request_failed` log events (operation, model, latencyMs, tokens, safe error codes only — never prompt or transcript content) so AI latency is visible in standard logs alongside the existing `AiUsageEvent` DB records; (b) roleplay `max_tokens` capped at 700 (from 2,000) to bound worst-case generation time while the existing 1,600-character response guard is unchanged; (c) roleplay reply generation now uses a new slim `findRoleplayContext` repository read (difficulty, variation, scenario definition, completed turns before the current sequence) instead of reloading the full attempt aggregate (all turns, evaluation, retry comparison) per turn; (d) `finalizeRoleplayTurn` consolidated into one conditional `UPDATE ... RETURNING` (ownership + `PENDING` status enforced in SQL) plus the usage insert, removing the attempt-row lock and separate turn read. REST contract, idempotency, authorization, and failure semantics are unchanged. Verified with 385 tests across 63 files, strict typecheck, and clean lint. Follow-up fix the same day: the consolidated `UPDATE ... RETURNING` initially failed in production-shaped traffic with Postgres `42702` (`column reference "id" is ambiguous`) because `RETURNING` columns were unqualified while the statement joins `SimulationAttempt` (which also has `id`); `RETURNING` columns are now alias-qualified (`turn."id"`, ...), verified against the real dev database with a rolled-back diagnostic transaction (unit tests mock `$queryRaw` and cannot catch SQL errors — raw SQL must be smoke-tested against a real DB). The one turn left stuck `PENDING` by the bug was marked `FAILED` so the existing retry flow recovers it. August 30 root-cause follow-up (temporary `PHASE_TIMING` instrumentation, since removed): middleware (3ms), the createTurn transaction (~440ms), the slim context read (~390ms), and Zod parsing (1ms) are all fast — the remaining turn latency is entirely inside the AI call. Two findings: (1) provider `latencyMs` previously measured only to response headers; OpenRouter accepts the request quickly (~0.7–1.3s) while generation finishes during body transfer, so all AI latency is now measured to body completion across roleplay, transcription, and TTS; (2) the roleplay model was generating hidden reasoning tokens on every turn (verified by live A/B: 8.5s with reasoning vs 2.6s with `reasoning: { enabled: false }`, zero reasoning content, normal reply quality). Roleplay requests now send `reasoning: { enabled: false }` (evaluation keeps reasoning — it is quality-sensitive and latency-tolerant). Live traffic after these fixes: turn total 6.1s with ~1.0s app overhead and ~5.1s genuine provider generation (78 output tokens ≈ 20 tok/s — upstream-bound; identical payloads varied 2.6s/5.1s/8.5s across calls, confirming provider-side variance). Roleplay provider routing now adds `provider.sort: "throughput"` (OpenRouter-documented preference for the fastest upstream; still ZDR-filtered — this is a routing preference, not model routing or fallback orchestration). Verified with 392 tests, strict typecheck, clean lint, and a live OpenRouter A/B smoke test. Remaining turn latency is dominated by upstream decode speed; further structural options (async `PENDING` + poll, or SSE streaming for first-token ~1–2s) need an `API_CONTRACT.md` decision and are not blocking.

21. September 1 simulation-start interaction mode chooser: `interactionMode` (`PUSH_TO_TALK` default / `REALTIME`) is chosen on the scenario setup screen, persisted on `SimulationAttempt` at creation (contracts, Prisma column + migration `20260901000000_add_interaction_mode`, API create/detail responses), carried over by retries, and enforced on the simulation screen — only the chosen mode initializes, and the opening message is spoken exactly once (stored-turn TTS autoplay in push-to-talk mode; the live agent in realtime mode, with stored-turn TTS autoplay suppressed there). Realtime remains feature-flagged and experimental; push-to-talk stays the Release 1 default with an always-available text fallback.

---

22. September 1 realtime transcript repair: finalized SDK transcript events now persist through the owner-authenticated `realtime-transcript` endpoint immediately after live disconnect and are retried before Finish. The submitted `conversationId` must already be bound to the active realtime attempt; imports are conversation-scoped and idempotent, capped at 20 turns, and set `transcriptImportedAt`. Finish retains its pending-transcript guard, while the signed ElevenLabs webhook remains an idempotent fallback. The earlier provider-pull recovery description is superseded; no provider transcript pull is used.

23. September 2 realtime transcript pairing & UI sync fix: fixed multi-utterance turn shredding and blocked evaluation in realtime voice mode. `pairLiveTranscriptEntries` (web) and `normalizeElevenLabsTranscript` (API) now group consecutive same-role speech chunks (e.g. natural pauses in user speech or multi-sentence AI responses) into unified conversational turns, skip the pre-turn initial agent opening greeting, and pair each learner turn with its following counterpart reply. `SubmitRealtimeTranscriptRequestSchema` now permits empty turn arrays so non-speaking live sessions still mark `transcriptImportedAt` without blocking Finish on `REALTIME_TRANSCRIPT_PENDING`. The simulation screen live transcript banner now displays a live status indicator instead of a static "Not saved" badge, and `TranscriptDrawer` and `SimulationHeader` accurately reflect live turns and allow opening the transcript during or after live calls. Verified with 429 tests across 67 test files, strict typecheck, and clean lint.

24. September 2 realtime turn-taking & noise hardening: hardened turn-taking, noise filtering, and interruption behavior for ElevenLabs realtime voice. Agents are configured with patient turn eagerness (`turn_eagerness: "patient"`, `turn_model: "turn_v3"`). The roleplay system prompt now explicitly directs the agent to ignore isolated nonverbal sounds (coughs, throat-clearing, sneezes, sighs, clicks) without commenting on them or asking if the learner is there, while preserving real speech containing hesitation fillers ("um", "uh", "well", "like") and respecting intentional interruptions. `isNonverbalNoise` helper safely detects isolated nonverbal/noise-only annotations (`*coughs*`, `[throat clearing]`, `(sighs)`, `...`) on both web (`pairLiveTranscriptEntries`) and backend (`normalizeElevenLabsTranscript`), suppressing them from polluting stored turns while preserving genuine speech and fillers. Verified with 434 tests across 67 test files, strict typecheck, and clean lint.

25. September 2 server-authoritative plan entitlements: implemented server-authoritative plan tiers (`FREE`, `PLUS`, `PRO`) on `User`, optional plan expiration (`planExpiresAt`), and an immutable practice-usage ledger (`PracticeUsageLedger`). Quota enforcement is strictly server-authoritative and atomic: when starting practice (`POST /api/v1/attempts`), the active plan tier and rolling 7-day usage are evaluated; `FREE` defaults to 3 simulations/week with environment-configurable limits (`FREE_PLAN_WEEKLY_SIMULATION_LIMIT`, `PLUS_PLAN_WEEKLY_SIMULATION_LIMIT`, `PRO_PLAN_WEEKLY_SIMULATION_LIMIT`); expired `PLUS`/`PRO` plans fall back to `FREE`; exceeded quotas return `403 Forbidden` (`PLAN_QUOTA_EXCEEDED`). An immutable usage record is inserted in the attempt creation transaction, and `onDelete: SetNull` on the attempt relationship ensures deleting attempts never restores practice quota. `GET /api/v1/me` exposes the active plan, effective tier, optional expiration, weekly limit, used count, remaining quota, and rolling window timestamps. No cron jobs or billing infrastructure were introduced. Verified with migration `20260902000000_add_plan_entitlements_and_usage_ledger` applied to the database, 465 tests across 69 test files passing, strict typecheck, clean lint, and Prettier verification.

## Source-of-Truth Docs

Agents should read in this order:

1. `/AGENTS.md`
2. `/docs/PROJECT_STATE.md`
3. `/docs/PRODUCT_REQUIREMENTS.md`
4. `/docs/ARCHITECTURE.md`
5. `/docs/DATABASE_DESIGN.md`
6. `/docs/API_CONTRACT.md`
7. `/docs/AI_DESIGN.md`

Some of these documents may not exist yet. Do not invent missing requirements; use approved docs and update `PROJECT_STATE.md` as milestones change.

---

## Current Next Task

Run the authenticated Milestone 13 core-loop smoke test in staging with valid Clerk, Neon, and OpenRouter configuration. If it passes with no release-blocking defect, record the evidence here, freeze features, and move formally from Development to Testing.
