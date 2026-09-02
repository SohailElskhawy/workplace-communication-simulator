# ARCHITECTURE.md

## 1. System Overview

Release 1 uses a small modular monorepo with two deployable applications:

```text
Browser
  │
  ├── Clerk authentication
  │
  ▼
Next.js Web (Vercel)
  │ HTTPS + bearer token
  ▼
Express API (Railway)
  ├── PostgreSQL / Neon
  └── AiService
       └── OpenRouterProvider
            ├── Roleplay
            ├── Evaluation
            ├── STT
            └── TTS
```

No microservices, Redis, queues, WebSockets, object storage, or realtime speech infrastructure in Release 1.

---

## 2. Repository Layout

```text
/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── contracts/
├── prisma/
├── docs/
├── AGENTS.md
└── pnpm-workspace.yaml
```

Use **pnpm workspaces**.

### `apps/web`
Owns:
- landing/authenticated UI;
- scenario browsing/setup;
- simulation UI;
- microphone capture;
- TTS playback;
- results/history/progress;
- local UI state.

Must not:
- contain OpenRouter secrets;
- call OpenRouter or any upstream AI provider directly;
- authorize resource ownership;
- calculate authoritative scores;
- expose hidden scenario configuration.

### `apps/api`
Owns:
- authentication verification;
- authorization;
- user provisioning;
- scenarios;
- attempts/turn lifecycle;
- AI orchestration;
- transcription/TTS;
- evaluation;
- deterministic scoring;
- progress;
- deletion;
- rate limiting;
- logging/monitoring.

### `packages/contracts`
Contains shared Zod DTO contracts and inferred TypeScript types.

May include:
- scenario public DTOs;
- attempt/turn DTOs;
- evaluation DTOs;
- progress/history DTOs;
- error contracts.

Must never expose hidden prompts, persona internals, AI objectives, or secret configuration.

---

## 3. Frontend Architecture

Use:
- Next.js App Router;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- TanStack Query;
- Zod;
- MediaRecorder.

State ownership:

### Server state
TanStack Query:
- scenarios;
- attempts;
- turns;
- evaluation;
- history;
- progress.

### Auth state
Clerk.

### Local UI state
React component state:
- text composer;
- recording/transcribing state;
- TTS playback;
- dialogs;
- transient errors.

Do not add Redux/Zustand unless a proven need appears.

Recommended routes:

```text
/
├── /sign-in
├── /sign-up
└── /app
    ├── /
    ├── /scenarios/[scenarioKey]
    ├── /simulations/[attemptId]
    ├── /results/[attemptId]
    ├── /history
    └── /progress
```

---

## 4. Backend Module Boundaries

Recommended structure:

```text
apps/api/src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── scenarios/
│   ├── attempts/
│   ├── evaluations/
│   ├── progress/
│   ├── voice/
│   └── ai/
├── infrastructure/
│   ├── database/
│   ├── logging/
│   └── monitoring/
├── middleware/
├── config/
└── app/
```

Primary domain services:

- `ScenarioService`
- `SimulationService`
- `EvaluationService`
- `ProgressService`
- `VoiceService`
- `AiService`

Keep services narrow. Do not introduce repository classes mechanically around every Prisma query.

---

## 5. Authentication

Use **Clerk**.

Flow:

```text
User signs in
  ↓
Frontend obtains Clerk session token
  ↓
Authorization: Bearer <token>
  ↓
Express verifies token
  ↓
API resolves local User
```

Rules:
- client never submits authoritative `userId`;
- API derives user identity from verified auth;
- protected resources are always ownership-filtered;
- non-owned private resources should generally return `404`.

Local User records are lazily provisioned on first authenticated API request.

---

## 6. Persistence

Use:
- PostgreSQL;
- Neon;
- Prisma ORM.

Primary entities:

- `User`
- `Scenario`
- `SimulationAttempt`
- `ConversationTurn`
- `Evaluation`
- `AiUsageEvent`

`Progress` is calculated from evaluations and is not persisted separately.

Use database constraints for important invariants and Prisma migrations for schema changes.

---

## 7. Scenario Architecture

Scenarios are:
- curated;
- versioned;
- immutable once used;
- defined in reviewed TypeScript configuration;
- validated with Zod;
- synchronized into PostgreSQL through seed logic.

Example source directory:

```text
apps/api/src/scenarios/definitions/
├── salary-negotiation.ts
├── behavioral-interview.ts
├── promotion-request.ts
├── manager-pushback.ts
├── difficult-feedback.ts
└── scope-creep.ts
```

If behavior changes after use, create a new version rather than editing historical configuration.

All six active Release 1 definitions are version 2 and add a curated
`variations[]` pool (v1 files/rows remain for historical attempts). Attempt
creation selects one variation, persists it as `SimulationAttempt.variationId`,
and roleplay/evaluation resolve it for the whole attempt. Selection is
deterministic application logic — no extra AI call.

Custom Interview Scenarios:
- Authenticated users on PLUS or PRO plans can upload a candidate CV (PDF) and target Job Description.
- The CV is parsed strictly in-memory using `unpdf` and is never persisted to disk or DB.
- OpenRouter generates a structured, Zod-validated `ScenarioDefinition` strictly grounded in CV facts and JD requirements.
- Custom scenarios are stored in PostgreSQL with `userId: owner_id`, `category: "CUSTOM"`, and `isActive: true`.
- Custom scenarios are owner-scoped (non-owners receive 404) and execute through the identical simulation/attempt/evaluation pipeline.

Hidden persona/rubric/variation content stays backend-only.

---

## 8. Simulation Architecture

Persistent lifecycle:

```text
ACTIVE
  ↓
EVALUATING
  ↓
COMPLETED
```

Other terminal/recovery states:
- `EVALUATION_FAILED`
- `ABANDONED`

A retry creates a new `SimulationAttempt`.

Historical attempts are immutable.

Only one learner turn may await AI completion at a time.

Session limits are enforced on the backend.

---

## 9. Conversation Turn Model

One learner input maps to one `ConversationTurn`.

Conceptually:

```text
ConversationTurn
- id
- attemptId
- sequence
- clientRequestId
- inputMethod
- userText
- assistantText?
- status
```

Status:
- `PENDING`
- `COMPLETED`
- `FAILED`

Rules:
- learner text is persisted before AI generation;
- AI failure never deletes accepted learner text;
- retry regenerates the AI response for the same turn;
- `clientRequestId` provides idempotency;
- duplicate submissions must not create duplicate turns.

---

## 10. AI Architecture

All provider access goes through:

```text
Application services
      ↓
   AiService
      ↓
OpenRouterProvider
```

Only `OpenRouterProvider` may call the OpenRouter API. Release 1 has one AI
provider and no generic provider registry, fallback chain, or multi-provider
orchestration.

Conceptual operations:
- `generateRoleplayReply()`
- `evaluateSimulation()`
- `transcribeAudio()`
- `synthesizeSpeech()`

Do not build generic multi-provider orchestration.

Preferred Release 1 model candidates:
- roleplay: `ROLEPLAY_MODEL=deepseek/deepseek-v4-flash-0731`;
- evaluation: `EVALUATION_MODEL=openai/gpt-5.6-luna-pro`, pending Milestone 6 calibration;
- STT: `TRANSCRIPTION_MODEL=openai/whisper-large-v3-turbo`;
- TTS: `TTS_MODEL=hexgrad/kokoro-82m`.

OpenRouter is the approved provider. Model candidates are replaceable
configuration, not provider architecture. All selected model IDs must be
explicit; never use automatic model routing.

Optimize each operation independently for quality per dollar. Roleplay is the
high-volume cost center, evaluation has low volume but high trust impact, STT
needs adequate accuracy because its output is editable, and TTS remains optional
and usage-controlled. Compare models using user-perceived quality, reliability,
latency, schema/instruction compliance, privacy compatibility, and measured cost
per completed simulation—not benchmark rank or token price alone.

---

## 11. Roleplay vs Evaluation

These are separate AI responsibilities.

### Roleplay
During an active simulation:
- remain in character;
- react to learner input;
- apply scenario difficulty;
- never coach or score.

### Evaluation
After transcript freeze:
- assess five universal skills;
- assess scenario objectives;
- reference actual turn IDs;
- return structured output.

Evaluation must not rely on the roleplay model's conversational conclusion as the score.

---

## 12. Evaluation Pipeline

```text
Frozen transcript
   ↓
Evaluation prompt
   ↓
Structured AI output
   ↓
Zod validation
   ↓
Reference validation
   ↓
Deterministic score calculation
   ↓
Persist canonical Evaluation
```

Validate:
- scores are 0–100;
- objective IDs exist;
- referenced turn IDs exist and belong to the attempt;
- required fields are present.

Retry malformed/invalid evaluation once.

No AI-generated overall score is authoritative.

---

## 13. Deterministic Business Logic

Application code owns:

```text
universalScore =
average(clarity, assertiveness, empathy, structure, conciseness)

scenarioScore =
average(normalized objective outcomes)

overallScore =
round(universalScore * 0.70 + scenarioScore * 0.30)
```

Progress:
- latest five eligible completed evaluations;
- average each universal skill;
- weakest skill = lowest current average.

No AI call is required for progress or scenario recommendation.

---

## 14. Voice Architecture

Input flow:

```text
MediaRecorder
  ↓
temporary audio Blob
  ↓
API transcription
  ↓
editable text composer
  ↓
learner sends
  ↓
normal ConversationTurn
```

Raw audio is not persisted.

TTS flow:

```text
stored assistantText
  ↓
TTS endpoint
  ↓
temporary browser audio
  ↓
playback
```

TTS failure never changes turn state or blocks conversation.

---

## 15. API Style

Use REST under:

```text
/api/v1
```

Success:

```json
{ "data": {} }
```

Failure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe message",
    "requestId": "..."
  }
}
```

Frontend behavior must depend on stable error codes, not string matching.

No token streaming in Release 1.

---

## 16. Security

Backend baseline:
- Clerk auth middleware;
- ownership checks;
- Helmet;
- strict CORS;
- request/body limits;
- rate limiting;
- Zod validation;
- environment validation;
- centralized error handling;
- request IDs.

Never:
- expose secrets to browser;
- trust client `userId`;
- expose hidden scenario content;
- log Authorization headers;
- log transcripts;
- log prompts/responses;
- persist raw audio.

---

## 17. Logging and Monitoring

Use structured JSON logging, preferably Pino.

Safe metadata:
- requestId;
- route;
- status;
- latency;
- internal user/attempt IDs where needed;
- AI operation/model;
- sanitized error code.

AI usage metadata is stored separately via `AiUsageEvent`.

It must support approximate cost per roleplay turn, evaluation, transcription,
TTS request, and completed simulation without adding billing infrastructure.

Do not store transcript or prompt contents in telemetry.

Use Sentry for frontend/backend exceptions with sensitive request-body capture disabled.

---

## 18. Environment Configuration

Validate environment variables with Zod.

API examples:

```text
DATABASE_URL
DIRECT_URL
CLERK_SECRET_KEY
OPENROUTER_API_KEY
ROLEPLAY_MODEL
EVALUATION_MODEL
TRANSCRIPTION_MODEL
TTS_MODEL
ROLEPLAY_TIMEOUT_MS
EVALUATION_TIMEOUT_MS
TRANSCRIPTION_TIMEOUT_MS
TTS_TIMEOUT_MS
WEB_ORIGIN
SENTRY_DSN
```

Web examples:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_SENTRY_DSN
```

Never expose server secrets through `NEXT_PUBLIC_*`.

`ROLEPLAY_MODEL`, `EVALUATION_MODEL`, `TRANSCRIPTION_MODEL`, and `TTS_MODEL` are required.

---

## 19. Deployment

```text
Next.js Web     → Vercel
Express API     → Railway
PostgreSQL      → Neon
Authentication  → Clerk
AI              → OpenRouter
```

Environments:
- local;
- staging;
- production.

Use Prisma migrations.

For schema changes:

```text
1. Apply backward-compatible migration
2. Deploy API
3. Deploy web
4. Smoke test
```

Do not first-deploy the product on release day.

---

## 20. Architectural Invariants

Agents must preserve these:

1. Browser never calls OpenRouter or any upstream AI provider directly.
2. Browser never controls authoritative user identity.
3. Hidden scenario configuration remains backend-only.
4. Used scenario versions are immutable.
5. Retries create new attempts.
6. One learner input maps to one turn.
7. Turn creation is idempotent.
8. Learner text survives AI failure.
9. Roleplay and evaluation are separate.
10. Frontend never calculates authoritative scores.
11. Overall score is deterministic.
12. Progress is deterministic.
13. Evaluation evidence references stored turn IDs.
14. AI never supplies authoritative learner quotes.
15. Raw microphone audio is not persisted.
16. TTS audio is not persisted.
17. TTS failure never blocks text.
18. Transcripts are never written to standard logs.
19. AI calls have explicit timeouts.
20. Do not add infrastructure without a concrete P0 need.
21. Release 1 uses only `OpenRouterProvider`; no automatic model routing or multi-provider orchestration.
22. Prefer Zero Data Retention-compatible OpenRouter routing/providers where available; privacy outranks the cheapest route.

---

## 21. Current Development Target

First vertical slice:

```text
Auth
  ↓
Salary Negotiation / Medium
  ↓
Start Attempt
  ↓
Text Conversation
  ↓
Finish
  ↓
Structured Evaluation
  ↓
Persisted Results
```

Do not implement voice, TTS, retry comparison, progress, history, or remaining scenarios before this slice works end-to-end.
