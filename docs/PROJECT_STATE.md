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
configuration. Configured model IDs and operation timeouts remain adjustable;
TTS stays unset until its milestone.

Preferred Release 1 model candidates:

- roleplay: `deepseek/deepseek-v4-flash-0731`;
- evaluation: `openai/gpt-5.6-luna-pro`, pending Milestone 6 calibration;
- transcription: `openai/whisper-large-v3-turbo`;
- TTS: TBD until the TTS milestone; no model is locked.

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
15. Text-to-Speech audio generation / Playback (Milestone 11)

---

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

Milestone 10 is complete. Push-to-talk recording, microphone permissions, memory-only transcription via OpenRouter Whisper, 120s limit, editable composer insertion, and reliable text fallback are fully verified across contracts, API, and web. Proceed to **Milestone 11 — Text-to-Speech (TTS)** when directed. Do not start Milestone 11 without user approval.

