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

**Milestone 7 — Results Experience** is complete. The full vertical slice flow
(`Auth → Scenario → Start Attempt → Text Conversation → Finish → Evaluation → Persisted Results`)
is implemented and verified locally across frontend, backend, and shared contracts.

Completed results experience:

- Type-safe, validated API client (`createApiClient`, `ApiClientError`) handling REST communication with Express API and Clerk token authorization;
- Scoring presentation utilities (`score-utils.ts`) for deterministic score bands (Exceptional, Strong, Competent, Developing, Needs Focus), universal skill metadata, objective status formatting, and coaching moment type badges;
- App layout with persistent authenticated header (`AppHeader`), Clerk `UserButton`, and responsive navigation;
- Scenario hub page (`/app`) displaying available scenarios (Salary Negotiation v1) with categories, summaries, and practice triggers;
- Scenario briefing & configuration page (`/app/scenarios/[scenarioKey]`) with situation context, role details, primary objective, stakes, and difficulty selection (Easy / Medium / Hard);
- Active text simulation conversation workspace (`/app/simulations/[attemptId]`) with counterpart opening message, learner/AI message stream, pending AI response indicator, turn error recovery with retry trigger, composer with Enter-to-send and character count, and simulation finish action;
- Comprehensive Results Page (`/app/results/[attemptId]`):
  - Overall score banner (0–100) with score band and clear explanation of the deterministic 70/30 formula (70% universal skills average + 30% scenario objectives);
  - Executive coaching summary;
  - 5 Universal Communication Skills visual breakdown (Clarity, Assertiveness, Empathy, Structure, Conciseness) with proficiency score bars and qualitative band badges;
  - Scenario Objectives outcomes with status badges (Achieved, Partially Achieved, Missed), explanations, and evidence turn references;
  - Key Strengths and Areas for Growth sections with evidence references;
  - Evidence-linked Coaching Moments matching stored learner turn text (`moment.turnId` to `turn.userText` from attempt transcript, strictly avoiding quote fabrication), coach feedback, and Stronger Alternative Phrasing (`betterResponse`);
  - Recommended Next Focus area with targeted skill and actionable rationale;
  - Full toggleable conversation transcript review highlighting turns cited in coaching evidence;
  - Asynchronous evaluation state handling (animated evaluating indicator with automatic evaluation triggering), error recovery state for `EVALUATION_FAILED` with "Retry Evaluation" button, and abandoned state handling for 0-turn sessions;
  - "Practice Again (Retry)" action creating a new attempt linked via `retryOfAttemptId`;
- Unit tests covering scoring utilities, formatting, API client, and error handling.

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

The full suite contains 107 passing tests across 24 test files.

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
11. Results experience (Milestone 7 - Complete)
12. Retry and comparison (Milestone 8)

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

Milestone 7 is complete. The full text-only vertical slice (`Auth → Scenario → Start Attempt → Text Conversation → Finish → Evaluation → Persisted Results`) is working end-to-end. Proceed to **Milestone 8 — Retry & Attempt Comparison** when directed.
