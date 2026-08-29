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

**Milestone 8 — Retry & Attempt Comparison** is complete. The retry flow and deterministic comparison engine are implemented and verified end-to-end across contracts, backend, and frontend.

Completed Retry & Comparison features:

- Shared Comparison Contract (`packages/contracts`):
  - `SkillDeltasSchema` & `type SkillDeltas` calculating exact point deltas for all 5 universal communication skills (Clarity, Assertiveness, Empathy, Structure, Conciseness);
  - `ObjectiveDeltaStatusSchema` (`IMPROVED`, `REGRESSED`, `UNCHANGED`) & `ObjectiveDeltaSchema` comparing previous vs. current status for all scenario objectives;
  - `WeakAreaComparisonSchema` tracking progress against the specific growth target identified in the previous attempt's `nextFocus.skill`;
  - `AttemptComparisonSchema` with difficulty equivalence checking (`comparable: boolean`, `nonEquivalentReason: string | null`), deterministic overall score delta, universal skill deltas, objective status changes, and weak area focus progress;
  - `AttemptComparisonResponseSchema` for dedicated endpoint queries (`GET /api/v1/attempts/:attemptId/comparison`);
  - Extended `AttemptDetailResponseSchema` to optionally include `comparison`.
- Pure Deterministic Comparison Logic (`apps/api`):
  - `calculateAttemptComparison(current, previous)` computing score deltas, objective outcome changes, weak area progress, and cross-difficulty non-equivalence flags;
  - Strictly enforces the cross-difficulty rule: attempts with differing difficulty levels (e.g. Medium to Hard) are marked `comparable: false` with explicit informational reason text, while preserving numerical transparency.
- Backend Repository, Service, and Routes (`apps/api`):
  - Prisma query inclusion of `retryOfAttempt` relation;
  - Automatic calculation and embedding of `comparison` in attempt details;
  - Added dedicated `GET /api/v1/attempts/:attemptId/comparison` endpoint with authentication, authorization, and 404 validation.
- Web Results UI & Score Utilities (`apps/web`):
  - `formatDelta` helper formatting positive (+X, emerald badge), negative (-X, rose badge), and neutral (0, slate badge) deltas;
  - `formatObjectiveDeltaStatus` helper displaying visual outcome changes (↑ Improved, ↓ Regressed, – No Change);
  - `fetchAttemptComparison` in typed `api-client.ts`;
  - Dedicated **Attempt Comparison** section on the results page (`/app/results/[attemptId]`):
    - Overall score change card with point delta pill;
    - Targeted Weak Area progress card with previous vs. current score and goal outcome badge ("✓ Goal Improved" / "Needs Continued Focus");
    - 5 Universal Skills delta breakdown table;
    - Scenario Objectives outcome changes table;
    - Prominent cross-difficulty warning notice when comparing across different difficulty settings.
  - Interactive retry controls defaulting to the current attempt's difficulty while allowing explicit difficulty selection (Easy / Medium / Hard) for the retry attempt;
  - Immutability preserved: every retry creates a new attempt referencing `retryOfAttemptId`; historical attempts are never overwritten or mutated.
- Comprehensive Unit & Integration Tests:
  - 126 tests across 26 test files passing cleanly.

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
13. Session history and progress profile (Milestone 9)

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

Milestone 8 is complete. The retry loop and attempt comparison are fully verified across contracts, API, and web. Proceed to **Milestone 9 — History & Progress Profile** when directed. Do not start Milestone 9 without user approval.
