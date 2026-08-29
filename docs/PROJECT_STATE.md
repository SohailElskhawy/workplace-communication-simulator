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
- OpenAI behind internal `AiService`

Initial model allocation:
- roleplay: GPT-5.6 Luna
- evaluation: GPT-5.6 Terra
- STT: GPT-Transcribe
- TTS: GPT-4o Mini TTS

Models must remain environment-configurable.

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

- browser never talks directly to OpenAI;
- browser never supplies authoritative user identity;
- hidden scenario configuration never leaves backend;
- users may access only their own sessions/evaluations;
- no secrets in frontend code;
- no transcripts in standard logs;
- no raw audio persistence;
- AI calls have explicit timeouts;
- expensive AI endpoints are rate-limited;
- structured AI output is runtime-validated.

---

## Current Development Milestone

Milestone 4 — Attempt Lifecycle is implemented and locally verified.

Completed attempt lifecycle:

- `SimulationAttempt` and `ConversationTurn` Prisma models with approved enums, ownership/version relations, retry linkage, lifecycle timestamps, and cascade/restrict behavior;
- migration-level `sequence >= 1` enforcement plus unique sequence and client-request idempotency constraints;
- PostgreSQL partial unique index enforcing at most one `PENDING` turn per attempt;
- frontend-safe shared Zod contracts for attempt creation, retrieval, turn acceptance, and finishing;
- `POST /api/v1/attempts` and `GET /api/v1/attempts/:attemptId` with authenticated local-user ownership and non-owned-resource hiding;
- `POST /api/v1/attempts/:attemptId/turns` with learner-text persistence, `(attemptId, clientRequestId)` idempotency, a 20-turn ceiling, 15-minute expiry, and pending-turn exclusion;
- `POST /api/v1/attempts/:attemptId/finish` with idempotent `ACTIVE → ABANDONED` and `ACTIVE → EVALUATING` transitions;
- row-locked Prisma transactions serializing turn acceptance and finish operations per attempt;
- stable recovery from unique-constraint races through idempotent replay or pending-turn conflict;
- safe lifecycle errors and 64 KB JSON request limit without logging learner content;
- focused ownership, retry validation, lifecycle, expiry, turn-limit, pending-turn, idempotency, contract, and endpoint tests.

Verified on August 29, 2026 with:

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm prisma:validate
corepack pnpm prisma:generate
Prisma migration diff from an empty PostgreSQL schema
```

The full suite contains 44 passing tests across 14 files. Applying migrations
and running `corepack pnpm prisma:seed` against the configured Neon target remain
deployment smoke checks; local verification does not use production or staging
credentials.

The active development target remains the first end-to-end **text-only vertical slice** using:

**Salary Negotiation / Medium**

Required path:

`Auth → Scenario → Start Attempt → Text Conversation → Finish → Evaluation → Persisted Results`

Voice, TTS, retry comparison, progress, history, and the remaining scenarios come after this vertical slice works reliably.

---

## Immediate Development Order

1. Repository/workspace foundation
2. Next.js + Express + shared contracts
3. Environment validation
4. Clerk authentication
5. Prisma + Neon database foundation
6. Salary Negotiation scenario v1
7. Attempt/session lifecycle
8. Text roleplay
9. Structured evaluation + Zod validation
10. Deterministic 70/30 scoring
11. Results experience

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

Begin Milestone 5 — Text Roleplay for Salary Negotiation / Medium only.

Build on the persisted `PENDING` learner turn: generate the roleplay response
behind the internal `AiService`, update the same turn to `COMPLETED` or `FAILED`,
and preserve accepted learner text through provider failure. Do not start
evaluation, voice, retry comparison, history, progress, or additional scenarios.
