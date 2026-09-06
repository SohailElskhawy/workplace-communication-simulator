# DATABASE_DESIGN.md

## 1. Database & Technology
- PostgreSQL on Neon with Prisma ORM.
- Application state, versioned definitions, attempts, transcripts, evaluations, and usage telemetry.
- Zero raw audio or TTS audio persistence. No separate `Progress` table (progress is calculated deterministically from latest 5 eligible evaluations).

## 2. Core Entities
```text
User 1 ───── * SimulationAttempt 1 ───── * ConversationTurn
  │                     │
  │                     ├── 0..1 Evaluation
  │                     └── 0..* AiUsageEvent
  └────────── * PracticeUsageLedger
```

### `User`
- `id` (UUID PK), `authProviderUserId` (String UNIQUE, Clerk ID), `plan` (Enum: FREE, PLUS, PRO), `planExpiresAt` (DateTime nullable), `createdAt`, `updatedAt`.

### `Scenario`
- `id` (UUID PK), `userId` (UUID FK nullable, null for curated, user.id for custom), `key` (String), `version` (Int), `title` (String), `category` (String, e.g. "CUSTOM"), `summary` (String), `definition` (JSONB), `isActive` (Boolean), `createdAt`.
- Unique constraint: `[key, version]`. Curated definitions are immutable; changes require a new version.
- `definition` JSONB: learnerRole, aiRole, objective, objections, difficulties (Easy/Med/Hard), openingMessage, openingMessageAr, evaluationObjectives.

### `SimulationAttempt`
- `id` (UUID PK), `userId` (UUID FK), `scenarioId` (UUID FK), `scenarioKey` (String), `scenarioVersion` (Int), `difficulty` (Enum: EASY, MEDIUM, HARD), `language` (Enum: en, ar), `dialect` (Enum nullable: EGYPTIAN, GULF), `interactionMode` (Enum: PUSH_TO_TALK, REALTIME), `status` (Enum: ACTIVE, EVALUATING, COMPLETED, EVALUATION_FAILED, ABANDONED), `turnCount` (Int), `retryOfAttemptId` (UUID FK nullable, self-ref), `variationId` (String nullable), `evaluationClaimedAt` (DateTime nullable), `startedAt`, `endedAt`, `expiresAt`.

### `ConversationTurn`
- `id` (UUID PK), `attemptId` (UUID FK), `sequence` (Int), `learnerText` (String), `assistantText` (String nullable), `inputMethod` (Enum: TEXT, VOICE), `status` (Enum: PENDING, COMPLETED, FAILED), `createdAt`, `updatedAt`.
- Unique constraint: `[attemptId, sequence]`. Idempotent creation.

### `Evaluation`
- `id` (UUID PK), `attemptId` (UUID FK UNIQUE), `clarityScore` (Int 0-100), `assertivenessScore` (Int 0-100), `empathyScore` (Int 0-100), `structureScore` (Int 0-100), `concisenessScore` (Int 0-100), `universalAverageScore` (Int 0-100), `scenarioObjectiveScore` (Int 0-100), `overallScore` (Int 0-100), `summary` (String), `strengths` (String[]), `improvements` (String[]), `coachingMoments` (JSONB), `objectiveResults` (JSONB), `strongerResponses` (JSONB), `nextFocus` (String), `evaluatedAt`.
- `overallScore = round(0.70 * universalAverageScore + 0.30 * scenarioObjectiveScore)`.

### `PracticeUsageLedger`
- `id` (UUID PK), `userId` (UUID FK), `attemptId` (UUID FK nullable, onDelete: SetNull), `createdAt`.
- Tracks rolling 7-day simulation starts. Deleting an attempt sets `attemptId` to null, preserving usage count so deletion never restores quota.

### `AiUsageEvent`
- `id` (UUID PK), `userId` (UUID FK nullable), `attemptId` (UUID FK nullable), `operation` (Enum: ROLEPLAY, EVALUATION, TRANSCRIPTION, TTS, CUSTOM_SCENARIO), `model` (String), `inputTokens` (Int nullable), `outputTokens` (Int nullable), `latencyMs` (Int), `costUsd` (Float nullable), `status` (Enum: SUCCESS, ERROR), `createdAt`.

## 3. Key Indexes & Invariants
- Indexes: `SimulationAttempt(userId, createdAt)`, `ConversationTurn(attemptId, sequence)`, `PracticeUsageLedger(userId, createdAt)`.
- Foreign Keys: Deleting a `SimulationAttempt` cascades to `ConversationTurn`, `Evaluation`, and `AiUsageEvent`.
- Transactions: Never hold a database transaction open during an external AI or network call.
