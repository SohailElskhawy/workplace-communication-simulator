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

**Milestone 6 — Evaluation Pipeline** is complete. Its planned implementation,
prompt versioning, reference validation, deterministic scoring, persistence,
and endpoints are verified locally.

Completed evaluation pipeline:

- `UniversalSkill` enum and `Evaluation` Prisma model with relational columns for universal/scenario/overall scores (with 0–100 check constraints), JSONB coaching moments/strengths/improvements/objectives, ownership/attempt relation, and cascade deletion;
- `20260829030000_add_evaluation` PostgreSQL migration script with check constraints on all score columns;
- frontend-safe shared Zod contracts in `@kalemny/contracts` (`UniversalSkillSchema`, `ObjectiveStatusSchema`, `CoachingMomentTypeSchema`, `SkillScoresSchema`, `ObjectiveResultSchema`, `StrengthFeedbackSchema`, `ImprovementFeedbackSchema`, `CoachingMomentSchema`, `NextFocusSchema`, `EvaluationDataSchema`, `EvaluationResponseSchema`);
- `AttemptDetailResponseSchema` updated to include the canonical `EvaluationData` when present;
- universal 5-skill rubric definition (Clarity, Assertiveness, Empathy, Structure, Conciseness) and versioned prompt (`EVALUATION_PROMPT_VERSION=evaluation-v1`);
- OpenRouter structured JSON evaluation generation with explicit candidate model (`openai/gpt-5.6-luna-pro`), `provider.zdr=true`, `provider.data_collection="deny"`, and timeout cancellation;
- runtime Zod schema validation and domain reference validation (ensuring all cited turn IDs exist on the evaluated attempt and all scenario objectives are evaluated without quote fabrication);
- one automatic controlled retry on malformed/invalid evaluation output or transient provider failure;
- deterministic 70/30 scoring: 70% universal skill average + 30% scenario objective score computed strictly in application logic;
- atomic database transaction persisting canonical `Evaluation`, transitioning attempt status to `COMPLETED`, setting `progressEligible` (>= 3 completed learner turns), and recording safe `AiUsageEvent` with operation `EVALUATION`;
- `POST /api/v1/attempts/:attemptId/evaluation` endpoint with ownership checks, state validation (`EVALUATING`, `EVALUATION_FAILED`, `COMPLETED`), and idempotent evaluation retrieval without re-calling the AI provider;
- `GET /api/v1/attempts/:attemptId` returning the persisted evaluation when attempt is `COMPLETED`;
- focused tests for rubric assembly, prompt building, structured output validation, reference integrity, deterministic scoring calculations, lifecycle transitions, automated retry, error handling, repository transactions, and route handlers.

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

The full suite contains 93 passing tests across 22 test files.

The active development target remains the first end-to-end **text-only vertical slice** using:

**Salary Negotiation / Medium**

Required path:

`Auth → Scenario → Start Attempt → Text Conversation → Finish → Evaluation → Persisted Results`

Voice, TTS, retry comparison, progress, history, and the remaining scenarios come after this vertical slice works reliably.

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
11. Results experience (Milestone 7)

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

Milestone 6 is complete. Proceed to **Milestone 7 — Results Experience** to deliver the frontend results page, presenting the five universal skill scores, scenario objectives, evidence-linked moments, stronger responses, and next focus.
