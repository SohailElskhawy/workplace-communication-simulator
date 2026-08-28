# DATABASE_DESIGN.md

## 1. Database

Use:

- PostgreSQL
- Neon
- Prisma ORM

The database stores application state, transcripts, evaluations, scenario versions, and AI usage metadata.

It does **not** store raw microphone audio or generated TTS audio.

---

## 2. Core Entities

Release 1 uses:

```text
User
Scenario
SimulationAttempt
ConversationTurn
Evaluation
AiUsageEvent
```

No separate `Progress` table.

Progress is calculated from completed evaluations.

---

## 3. User

```text
User
- id                  UUID PK
- authProviderUserId  string UNIQUE
- createdAt           timestamp
- updatedAt           timestamp
```

Purpose:
- maps Clerk identity to application data;
- owns simulation attempts.

Do not duplicate Clerk profile data unless later required.

Relation:

```text
User 1 ─── * SimulationAttempt
```

---

## 4. Scenario

```text
Scenario
- id          UUID PK
- key         string
- version     integer
- title       string
- category    string/enum
- summary     string
- definition  JSONB
- isActive    boolean
- createdAt   timestamp
```

Constraint:

```text
UNIQUE(key, version)
version >= 1
```

Examples:

```text
salary-negotiation v1
salary-negotiation v2
```

### Versioning rule

Once a scenario version has been used by an attempt, do not modify its behavior/rubric in place.

Create a new version instead.

Historical attempts always reference the exact scenario version used.

---

## 5. Scenario Definition JSONB

`definition` contains backend-only scenario configuration validated by Zod.

Conceptually:

```text
publicContext
persona
aiObjective
difficulty
openingMessage
objectives[]
skillEmphasis[]
```

Hidden persona, AI objectives, and evaluation rules never leave the backend.

JSONB is appropriate because scenario configuration is structured but evolves more often than core relational data.

---

## 6. SimulationAttempt

```text
SimulationAttempt
- id                  UUID PK
- userId              UUID FK → User
- scenarioId          UUID FK → Scenario
- retryOfAttemptId    UUID FK → SimulationAttempt nullable
- difficulty          enum
- status              enum
- startedAt           timestamp
- endedAt             timestamp nullable
- expiresAt           timestamp
- progressEligible    boolean
- evaluationStartedAt timestamp nullable
- createdAt           timestamp
- updatedAt           timestamp
```

### Difficulty enum

```text
EASY
MEDIUM
HARD
```

### Status enum

```text
ACTIVE
EVALUATING
COMPLETED
EVALUATION_FAILED
ABANDONED
```

### Rules

- a retry creates a new attempt;
- previous attempts are never overwritten;
- `retryOfAttemptId` links retry chains;
- only `ACTIVE` attempts accept new turns;
- completed transcripts are immutable;
- progress eligibility is determined by backend logic.

---

## 7. Retry Relationship

Self-reference:

```text
SimulationAttempt.retryOfAttemptId
    → SimulationAttempt.id
```

Example:

```text
Attempt A
  ↑
Attempt B
  ↑
Attempt C
```

Each attempt remains independently queryable and evaluatable.

---

## 8. ConversationTurn

```text
ConversationTurn
- id               UUID PK
- attemptId        UUID FK → SimulationAttempt
- sequence         integer
- clientRequestId  string
- inputMethod      enum
- userText         text
- assistantText    text nullable
- status           enum
- createdAt        timestamp
- completedAt      timestamp nullable
```

### Input method

```text
TEXT
VOICE
```

### Turn status

```text
PENDING
COMPLETED
FAILED
```

### Constraints

```text
UNIQUE(attemptId, sequence)
UNIQUE(attemptId, clientRequestId)

sequence >= 1
```

### Rules

- learner text is stored before AI generation;
- AI failure never removes `userText`;
- retrying AI generation updates the same turn;
- only one pending turn may exist logically for an attempt;
- order is determined by `sequence`.

---

## 9. Evaluation

Each attempt has at most one canonical evaluation.

```text
Evaluation
- id               UUID PK
- attemptId        UUID FK UNIQUE

- clarity          integer
- assertiveness    integer
- empathy          integer
- structure        integer
- conciseness      integer

- universalScore   integer
- scenarioScore    integer
- overallScore     integer

- objectiveResults JSONB
- strengths        JSONB
- improvements     JSONB
- moments          JSONB

- nextFocusSkill   enum
- summary          text

- model            string
- promptVersion    string
- createdAt        timestamp
```

### Score constraints

Every numeric score:

```text
0 <= score <= 100
```

The five universal skill scores are relational columns because they are frequently queried for:

- progress;
- comparisons;
- averages;
- history summaries.

Coaching detail remains JSONB because it is primarily retrieved as one evaluation document.

---

## 10. Objective Results JSONB

Conceptually:

```text
[
  {
    objectiveId,
    status,
    explanation,
    evidenceTurnIds[]
  }
]
```

Status:

```text
ACHIEVED
PARTIALLY_ACHIEVED
MISSED
```

Backend validation must confirm:

- objective IDs exist in the scenario version;
- every evidence turn exists;
- every evidence turn belongs to this attempt.

---

## 11. Coaching Moments JSONB

Conceptually:

```text
[
  {
    turnId,
    type,
    explanation,
    betterResponse
  }
]
```

Types:

```text
STRENGTH
IMPROVEMENT
MISSED_OPPORTUNITY
```

Do not persist AI-reconstructed learner quotes.

The frontend uses `turnId` to display the actual stored `userText`.

---

## 12. Deterministic Scores

Backend calculates:

```text
universalScore =
average(
  clarity,
  assertiveness,
  empathy,
  structure,
  conciseness
)
```

Scenario objective mapping:

```text
ACHIEVED            = 100
PARTIALLY_ACHIEVED  = 50
MISSED              = 0
```

Then:

```text
scenarioScore =
average(normalized objective values)

overallScore =
round(
  universalScore * 0.70
  +
  scenarioScore * 0.30
)
```

The AI does not own the final overall score.

---

## 13. AiUsageEvent

Stores operational metadata only.

```text
AiUsageEvent
- id               UUID PK
- userId           UUID FK
- attemptId        UUID FK nullable
- operation        enum
- provider         string
- model            string
- status           string/enum
- latencyMs        integer
- inputTokens      integer nullable
- outputTokens     integer nullable
- audioDurationMs  integer nullable
- estimatedCost    decimal nullable
- errorCode        string nullable
- createdAt        timestamp
```

Operations:

```text
ROLEPLAY
EVALUATION
TRANSCRIPTION
TTS
```

Never store:
- prompt text;
- transcript content;
- AI output text;
- audio;
- raw provider error payloads containing user content.

---

## 14. Relationships

```text
User
  └── SimulationAttempt[]

Scenario
  └── SimulationAttempt[]

SimulationAttempt
  ├── ConversationTurn[]
  ├── Evaluation?            (1:0..1)
  ├── AiUsageEvent[]
  └── retryOfAttempt?        (self-reference)
```

---

## 15. Progress Query

No `Progress` entity.

For current skill profile:

```text
latest 5 Evaluations
WHERE
  attempt.userId = current user
  AND attempt.status = COMPLETED
  AND attempt.progressEligible = true
ORDER BY attempt.endedAt DESC
```

Average each universal skill.

If fewer than five eligible sessions exist, use all available.

Deleting an eligible attempt automatically changes future progress calculations.

---

## 16. Progress Eligibility

Backend sets:

```text
progressEligible = completed learner turns >= 3
```

Not eligible:
- abandoned attempts;
- failed evaluations;
- zero-turn sessions;
- 1–2 turn short attempts;
- deleted attempts.

The AI never determines progress eligibility.

---

## 17. Important Indexes

Recommended:

```text
User(authProviderUserId)

Scenario(key, version)
Scenario(key, isActive)

SimulationAttempt(userId, createdAt)
SimulationAttempt(userId, status)
SimulationAttempt(retryOfAttemptId)

ConversationTurn(attemptId, sequence)

Evaluation(attemptId)

AiUsageEvent(attemptId, createdAt)
AiUsageEvent(operation, createdAt)
```

Do not add indexes without a real query need.

---

## 18. Deletion

Deleting a `SimulationAttempt` should cascade to:

```text
ConversationTurn
Evaluation
attempt-linked AiUsageEvent
```

Retry descendants should **not** be silently deleted unless explicitly requested.

If an attempt referenced by `retryOfAttemptId` is deleted, choose a safe FK behavior during implementation, preferably:

```text
SET NULL
```

so later attempts remain valid.

Deleting user data should eventually cascade through owned attempts.

---

## 19. Transactions

Use transactions only for atomic database state changes.

Examples:

### Finish attempt

```text
verify ACTIVE
+
set EVALUATING
+
set endedAt
```

### Complete evaluation

```text
create Evaluation
+
set attempt COMPLETED
+
set progressEligible
```

Do not keep a database transaction open while calling OpenAI.

---

## 20. Data Retention

Persist:
- application user ID;
- scenario/version;
- attempt metadata;
- transcript text;
- evaluation;
- AI usage metadata.

Do not persist:
- microphone audio;
- TTS audio;
- AI request/response payload dumps;
- prompts in logs;
- transcript text in logs.

---

## 21. Database Invariants

Agents must preserve:

1. Used scenario versions are immutable.
2. Retries are new attempts.
3. One canonical evaluation per attempt.
4. One logical learner turn per `clientRequestId`.
5. Turn ordering is unique per attempt.
6. Learner text survives AI failure.
7. Skill scores remain 0–100.
8. Overall score is deterministic.
9. Progress is derived, not separately synchronized.
10. Coaching evidence must reference turns from the same attempt.
11. Audio is never stored in PostgreSQL.
12. Private user data is always ownership-scoped.
