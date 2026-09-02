# API_CONTRACT.md

## 1. Base Contract

Base path:

```text
/api/v1
```

All private endpoints require Clerk authentication.

Success:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe client message",
    "requestId": "..."
  }
}
```

Do not expose stack traces or raw provider errors.

---

## 2. Authentication Rules

Frontend sends:

```text
Authorization: Bearer <Clerk session token>
```

Backend:
- verifies token;
- derives authenticated user;
- lazily provisions local User;
- never trusts client-supplied `userId`.

Private resources are always ownership-scoped.

Non-owned private resources should generally return:

```text
404 NOT_FOUND
```

---

## 3. Common HTTP Semantics

```text
200 OK
201 Created
204 No Content

400 Invalid request
401 Unauthenticated
404 Missing / non-owned resource
409 Invalid lifecycle state / conflict
413 Payload too large
422 Semantically invalid request when useful
429 Rate limited
500 Unexpected application failure
502 AI/provider failure
504 AI/provider timeout
```

---

## 4. Stable Error Codes

Minimum set:

```text
UNAUTHENTICATED
NOT_FOUND
VALIDATION_FAILED
INVALID_ATTEMPT_STATE
SESSION_LIMIT_REACHED
TURN_ALREADY_PENDING
REALTIME_TRANSCRIPT_PENDING
AI_TIMEOUT
AI_PROVIDER_ERROR
TRANSCRIPTION_FAILED
TTS_FAILED
EVALUATION_FAILED
PLAN_QUOTA_EXCEEDED
PLAN_UPGRADE_REQUIRED
RATE_LIMITED
INTERNAL_ERROR
```

Frontend logic must depend on error codes, not message text.

---

## 5. User

### `GET /api/v1/me`

Purpose:
- verify authentication;
- ensure local User exists;
- expose server-authoritative plan entitlement, usage, and remaining quota.

Response:

```json
{
  "data": {
    "id": "uuid",
    "entitlement": {
      "plan": "FREE",
      "effectivePlan": "FREE",
      "expiresAt": null,
      "simulationsLimit": 3,
      "simulationsUsed": 1,
      "simulationsRemaining": 2,
      "windowStartsAt": "2026-08-26T10:00:00.000Z",
      "windowEndsAt": "2026-09-02T10:00:00.000Z"
    }
  }
}
```

Plan tiers: `FREE`, `PLUS`, `PRO`. If a PLUS or PRO plan has expired (`expiresAt <= currentTime`), `effectivePlan` is `FREE`.

Do not return unnecessary Clerk profile data.

---

## 6. Scenarios

### `GET /api/v1/scenarios`

Returns active public scenarios and, when authenticated, the user's active custom scenarios.

Response conceptually:

```json
{
  "data": [
    {
      "key": "salary-negotiation",
      "version": 1,
      "title": "Salary Negotiation",
      "category": "NEGOTIATION",
      "summary": "..."
    },
    {
      "key": "custom-interview-1234-uuid",
      "version": 1,
      "title": "Senior Frontend Engineer Interview - TechCorp",
      "category": "CUSTOM",
      "summary": "...",
      "isCustom": true
    }
  ]
}
```

No hidden persona, AI objective, rubric, or prompt data.

---

### `GET /api/v1/scenarios/:scenarioKey`

Returns the active public version for a curated scenario key, or the owner's custom scenario. For non-owned custom scenarios, returns `404 NOT_FOUND`.

Response conceptually:

```json
{
  "data": {
    "key": "salary-negotiation",
    "version": 1,
    "title": "Salary Negotiation",
    "summary": "...",
    "context": {
      "description": "...",
      "userRole": "...",
      "aiRole": "...",
      "userObjective": "...",
      "stakes": "..."
    },
    "availableDifficulties": [
      "EASY",
      "MEDIUM",
      "HARD"
    ]
  }
}
```

---

### `POST /api/v1/scenarios/custom`

Creates an owner-scoped custom interview scenario from an uploaded candidate CV (PDF) and pasted job description.

Requirements & Gating:
- Authenticated user required (`401 UNAUTHENTICATED` if missing).
- Plan entitlement must be `PLUS` or `PRO` (`403 PLAN_UPGRADE_REQUIRED` if `FREE`).
- Multipart form body: `cv` (PDF file, <= 5MB) and `jobDescription` (text, 50 to 20,000 characters).
- CV is parsed strictly in-memory and never persisted to disk or database.
- AI generates a Zod-validated `ScenarioDefinition` grounded exclusively in CV facts and JD requirements.

Response:

```json
{
  "data": {
    "key": "custom-interview-4392-uuid",
    "version": 1,
    "title": "Senior Software Engineer Interview - Acme",
    "category": "CUSTOM",
    "summary": "Personalized interview simulation tailored to your candidate background and Acme requirements.",
    "isCustom": true,
    "context": {
      "description": "...",
      "userRole": "Job Candidate",
      "aiRole": "Engineering Hiring Manager",
      "userObjective": "...",
      "stakes": "..."
    },
    "availableDifficulties": [
      "EASY",
      "MEDIUM",
      "HARD"
    ]
  }
}
```

---

## 7. Create Attempt

### `POST /api/v1/attempts`

Request:

```json
{
  "scenarioKey": "salary-negotiation",
  "difficulty": "MEDIUM",
  "retryOfAttemptId": null,
  "interactionMode": "PUSH_TO_TALK"
}
```

`interactionMode` values:

```text
PUSH_TO_TALK
REALTIME
```

Rules:
- scenario must be active;
- retry source, if provided, must belong to current user;
- retry source must reference the same scenario;
- default retry difficulty is handled by frontend or supplied explicitly;
- `interactionMode` is optional and defaults to `PUSH_TO_TALK`; it is chosen
  once at simulation start, persisted on the attempt, and never changed
  afterwards. `REALTIME` is only meaningful when the realtime voice feature
  is enabled; the simulation screen falls back to push-to-talk for a
  persisted `REALTIME` attempt when the frontend flag is disabled;
- server-authoritative quota is enforced atomically on creation:
  - rolling 7-day simulation usage is queried from `PracticeUsageLedger`;
  - FREE defaults to 3 simulations/week (configurable via environment);
  - expired PLUS/PRO plans fall back to FREE tier limit;
  - if weekly usage meets or exceeds the plan limit, returns `403 Forbidden`
    with `PLAN_QUOTA_EXCEEDED`;
  - on success, records the practice event in `PracticeUsageLedger`; deleting
    attempts never restores usage.

Response:

```json
{
  "data": {
    "id": "attempt-uuid",
    "status": "ACTIVE",
    "difficulty": "MEDIUM",
    "interactionMode": "PUSH_TO_TALK",
    "scenario": {
      "key": "salary-negotiation",
      "version": 1,
      "title": "Salary Negotiation"
    },
    "openingMessage": "...",
    "startedAt": "...",
    "expiresAt": "..."
  }
}
```

---

## 8. Read Attempt

### `GET /api/v1/attempts/:attemptId`

Owner-only.

Response conceptually:

```json
{
  "data": {
    "id": "attempt-uuid",
    "status": "ACTIVE",
    "difficulty": "MEDIUM",
    "interactionMode": "PUSH_TO_TALK",
    "scenario": {
      "key": "salary-negotiation",
      "version": 1,
      "title": "Salary Negotiation"
    },
    "retryOfAttemptId": null,
    "turns": [],
    "evaluation": null,
    "startedAt": "...",
    "endedAt": null,
    "expiresAt": "..."
  }
}
```

Only public scenario data is returned.

---

## 9. Send Conversation Turn

### `POST /api/v1/attempts/:attemptId/turns`

Request:

```json
{
  "clientRequestId": "client-generated-unique-id",
  "text": "I'd like to discuss my compensation.",
  "inputMethod": "TEXT"
}
```

`inputMethod`:

```text
TEXT
VOICE
```

Rules:
- attempt must belong to user;
- attempt must be `ACTIVE`;
- session limits must not be exceeded;
- only one turn may be pending;
- `clientRequestId` is required for idempotency;
- empty text is invalid.

Backend flow:

```text
validate
→ check idempotency
→ persist PENDING turn
→ generate AI reply
→ persist reply
→ mark COMPLETED
```

Success:

```json
{
  "data": {
    "id": "turn-uuid",
    "sequence": 1,
    "inputMethod": "TEXT",
    "userText": "...",
    "assistantText": "...",
    "status": "COMPLETED",
    "createdAt": "...",
    "completedAt": "..."
  }
}
```

If the same `clientRequestId` is retried, return the existing logical turn.

---

## 10. Failed Turn Retry

### `POST /api/v1/attempts/:attemptId/turns/:turnId/retry`

Allowed only when:

```text
turn.status = FAILED
```

Rules:
- owner-only;
- attempt must remain `ACTIVE`;
- retry regenerates assistant response for the same learner message;
- no new `ConversationTurn` is created.

Success returns the updated turn.

---

## 11. Transcription

### `POST /api/v1/attempts/:attemptId/transcriptions`

Content type:

```text
multipart/form-data
```

Contains one audio file.

Rules:
- owner-only;
- attempt must be `ACTIVE`;
- enforce supported MIME types;
- enforce payload/duration limit;
- maximum recording duration: 120 seconds.

Response:

```json
{
  "data": {
    "transcript": "I'd like to discuss..."
  }
}
```

Important:

> Transcription does not create a ConversationTurn.

Frontend inserts returned text into the editable composer.

When later sent, use:

```text
inputMethod = VOICE
```

Raw audio is not persisted.

---

## 12. TTS

### `POST /api/v1/attempts/:attemptId/turns/:turnId/speech`

Request body contains no arbitrary text.

Backend:
- verifies ownership;
- loads stored `assistantText`;
- generates speech from that text.

Response:

```text
audio binary
```

TTS is optional.

Failure must not alter conversation state.

Generated audio is not persisted.

---

## 13. Finish Attempt

### `POST /api/v1/attempts/:attemptId/finish`

Owner-only.

Behavior:

### Zero learner turns

```text
ACTIVE → ABANDONED
```

No evaluation.

### One or more learner turns

```text
ACTIVE → EVALUATING
```

Transcript becomes frozen.

The operation is idempotent.

Repeated calls must not start competing evaluation workflows.

Response conceptually:

```json
{
  "data": {
    "id": "attempt-uuid",
    "status": "EVALUATING"
  }
}
```

---

## 14. Generate / Retrieve Evaluation

### `POST /api/v1/attempts/:attemptId/evaluation`

Owner-only.

Allowed for:

```text
EVALUATING
EVALUATION_FAILED
COMPLETED
```

Behavior:

### If already completed

Return existing canonical Evaluation.

Do not generate another one.

### If evaluating / failed

Backend:

```text
freeze/read transcript
→ call evaluator
→ validate structured output
→ validate turn/objective references
→ retry once if required
→ calculate deterministic scores
→ persist Evaluation
→ mark COMPLETED
```

Failure:

```text
status = EVALUATION_FAILED
```

Transcript remains available.

---

## 15. Evaluation Response

Conceptually:

```json
{
  "data": {
    "attemptId": "uuid",

    "skills": {
      "clarity": 80,
      "assertiveness": 65,
      "empathy": 75,
      "structure": 82,
      "conciseness": 70
    },

    "universalScore": 74,
    "scenarioScore": 75,
    "overallScore": 74,

    "objectives": [
      {
        "objectiveId": "CLEAR_REQUEST",
        "status": "ACHIEVED",
        "explanation": "...",
        "evidenceTurnIds": ["turn-uuid"]
      }
    ],

    "strengths": [],
    "improvements": [],
    "moments": [
      {
        "turnId": "turn-uuid",
        "type": "IMPROVEMENT",
        "explanation": "...",
        "betterResponse": "..."
      }
    ],

    "summary": "...",

    "nextFocus": {
      "skill": "ASSERTIVENESS",
      "reason": "..."
    },

    "createdAt": "..."
  }
}
```

AI does not supply authoritative overall score.

Frontend retrieves actual learner quote from `turnId`.

---

## 16. History

### `GET /api/v1/history`

Owner-only.

Use cursor pagination.

Query conceptually:

```text
?cursor=<cursor>&limit=20
```

Response:

```json
{
  "data": [
    {
      "attemptId": "uuid",
      "scenario": {
        "key": "salary-negotiation",
        "title": "Salary Negotiation"
      },
      "difficulty": "MEDIUM",
      "status": "COMPLETED",
      "overallScore": 74,
      "retryOfAttemptId": null,
      "completedAt": "..."
    }
  ],
  "meta": {
    "nextCursor": null
  }
}
```

---

## 17. Progress

### `GET /api/v1/progress`

Owner-only.

No AI call.

Response:

```json
{
  "data": {
    "skills": {
      "clarity": 78,
      "assertiveness": 64,
      "empathy": 81,
      "structure": 76,
      "conciseness": 72
    },
    "weakestSkill": "ASSERTIVENESS",
    "recommendedScenario": {
      "key": "salary-negotiation",
      "title": "Salary Negotiation"
    },
    "eligibleSessionCount": 4
  }
}
```

Values come from the latest five eligible completed evaluations.

If no eligible attempts exist, return a valid empty-state representation rather than an error.

---

## 18. Attempt Comparison

Comparison may be included in result retrieval when:

```text
retryOfAttemptId != null
```

For same scenario + same difficulty, response may include:

```json
{
  "comparison": {
    "comparable": true,
    "overallDelta": 8,
    "skillDeltas": {
      "clarity": 5,
      "assertiveness": 12,
      "empathy": 0,
      "structure": 7,
      "conciseness": 4
    }
  }
}
```

If difficulty differs:

```json
{
  "comparison": {
    "comparable": false
  }
}
```

Do not present cross-difficulty deltas as equivalent improvement.

---

## 19. Delete Attempt

### `DELETE /api/v1/attempts/:attemptId`

Owner-only.

Deletes:
- attempt;
- turns;
- evaluation;
- attempt-linked AI usage records.

Retry descendants remain valid.

If needed, their `retryOfAttemptId` becomes `null`.

Response:

```text
204 No Content
```

Progress automatically recalculates from remaining eligible evaluations.

---

## 20. Idempotency Rules

Required for expensive or lifecycle-sensitive operations.

### Turn creation
Key:

```text
attemptId + clientRequestId
```

Duplicate request returns existing turn.

### Finish
Repeated finish requests return current attempt state.

### Evaluation
Completed attempt returns existing canonical Evaluation.

At most one canonical evaluation may exist per attempt.

---

## 21. Attempt State Rules

### `ACTIVE`
Allowed:
- send turn;
- retry failed turn;
- transcribe;
- generate TTS;
- finish.

### `EVALUATING`
Allowed:
- read attempt;
- generate/recover evaluation.

Not allowed:
- new conversation turns.

### `COMPLETED`
Allowed:
- read;
- results;
- TTS for stored assistant turns if desired;
- retry by creating new attempt;
- delete.

### `EVALUATION_FAILED`
Allowed:
- read transcript;
- retry evaluation;
- delete.

### `ABANDONED`
Allowed:
- read metadata;
- delete.

No new conversation turns.

---

## 22. Session Limits

Backend is authoritative.

Before accepting a turn verify:

```text
learnerTurnCount < 20
currentTime < expiresAt
```

If exceeded:

```text
SESSION_LIMIT_REACHED
```

The user may still finish/evaluate an eligible session.

---

## 23. Request Limits

Recommended initial limits:

### JSON
Approximately:

```text
64 KB
```

### Audio
Limited according to the approved 120-second recording ceiling.

Reject unsupported MIME types before calling the AI provider.

---

## 24. AI Failure Semantics

### Roleplay failure

Persist learner turn as:

```text
FAILED
```

Return safe provider error.

Learner can retry the same turn.

### Evaluation failure

Retry automatically once where appropriate.

If still invalid/unavailable:

```text
attempt.status = EVALUATION_FAILED
```

### Transcription failure

Return:

```text
TRANSCRIPTION_FAILED
```

Simulation remains usable through text.

### TTS failure

Return:

```text
TTS_FAILED
```

Conversation state remains unchanged.

---

## 25. Contract Validation

All JSON request/response DTOs should have Zod contracts.

Use shared contracts for frontend-safe data.

Backend-only validation remains backend-only for:
- scenario definitions;
- evaluator structured output;
- hidden AI configuration.

Never expose private AI prompt schemas through the public contracts package.

---

## 26. Current Vertical Slice Endpoints

Development should initially implement only what is needed for:

`Auth → Salary Negotiation / Medium → Text Conversation → Finish → Evaluation → Results`

Minimum initial endpoints:

```text
GET  /api/v1/me

GET  /api/v1/scenarios
GET  /api/v1/scenarios/:scenarioKey

POST /api/v1/attempts
GET  /api/v1/attempts/:attemptId

POST /api/v1/attempts/:attemptId/turns

POST /api/v1/attempts/:attemptId/finish
POST /api/v1/attempts/:attemptId/evaluation
```

Add voice, history, progress, comparison, and deletion after this slice works end-to-end.

---

## 27. Realtime Voice and Canonical Transcript Import

ElevenLabs realtime voice is enabled only when the server-only settings
`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, and `ELEVENLABS_TOOL_SECRET` are
configured. Canonical post-call import is enabled only when
`ELEVENLABS_AGENT_ID` and server-only `ELEVENLABS_WEBHOOK_SECRET` are
configured.

A feature-flagged frontend spike (`NEXT_PUBLIC_ENABLE_REALTIME_VOICE=true`)
consumes the session endpoint from the simulation screen: it requests
microphone permission, calls `realtime-session`, and starts the ElevenLabs
WebRTC session with the returned `conversationToken` plus the public dynamic
variables `opening_message` and `secret__kalemny_context_token`. After the SDK
creates the conversation, the browser immediately binds its provider-issued ID
to the owner-authenticated attempt. The browser never supplies user identity,
scenario key, variation, or difficulty. Its finalized live transcript events
are submitted only for that already-bound conversation after disconnect.

The interaction mode is chosen at simulation start and persisted on the
attempt (`interactionMode`). The simulation screen initializes only the chosen
mode: push-to-talk attempts auto-play the opening message once through stored
turn TTS, while realtime attempts suppress stored-turn TTS autoplay so the
live agent speaks the opening message exactly once when the session connects.
Existing text, STT, TTS, and evaluation flows are unchanged. No variation is
selected by these endpoints: the attempt's persisted `variationId` is
authoritative.

### `POST /api/v1/attempts/:attemptId/realtime-session`

Clerk-authenticated, owner-only.

Rules:
- attempt must belong to the user (`404 NOT_FOUND` otherwise);
- attempt must be `ACTIVE` (`409 INVALID_ATTEMPT_STATE`);
- unexpired (`409 SESSION_LIMIT_REACHED` when past `expiresAt`);
- issues a short-lived ElevenLabs WebRTC conversation token server-side;
- issues a short-lived signed context token bound to the attempt and user;
- rate limited as an expensive AI request.

Response (public scenario data only — never hidden persona, objective,
counterpart, or prompt configuration):

```json
{
  "data": {
    "attemptId": "uuid",
    "agentId": "elevenlabs-agent-id",
    "conversationToken": "short-lived ElevenLabs WebRTC token",
    "contextToken": "short-lived signed Kalemny context token",
    "contextTokenExpiresAt": "...",
    "scenario": {
      "key": "salary-negotiation",
      "version": 2,
      "title": "Salary Negotiation"
    },
    "difficulty": "MEDIUM",
    "openingMessage": "resolved from the attempt's stored variation",
    "expiresAt": "..."
  }
}
```

Provider failures map to `AI_TIMEOUT` (504) / `AI_PROVIDER_ERROR` (502).

### `POST /api/v1/attempts/:attemptId/realtime-conversation`

Clerk-authenticated and owner-only. The request contains only the
ElevenLabs-created conversation ID:

```json
{ "conversationId": "conv_..." }
```

It creates the unique `conversationId → SimulationAttempt` mapping. Repeating
the same mapping is idempotent. A conversation ID already bound to another
attempt is returned as `404 NOT_FOUND`, without exposing that attempt.

### `POST /api/v1/webhooks/elevenlabs`

Public ElevenLabs callback; it is not Clerk-authenticated. It accepts only
`post_call_transcription` and reads the raw JSON body before parsing. The
`ElevenLabs-Signature` header must be `t=<unix>,v0=<hex hmac>` where the HMAC
SHA-256 input is `<timestamp>.<raw body>`. Timestamps more than 30 minutes
from server time and signatures that do not match in constant time return 401.

After signature verification, backend-only Zod validation requires the
configured `agent_id` and a stored conversation mapping. Agent mismatches,
unknown conversations, already-imported conversations, and frozen attempts
return safe 2xx responses without resource details. Webhook payloads,
transcripts, signatures, prompts, context tokens, and audio are never logged.

Only finalized `data.transcript` is canonical. Empty/tool-only entries and the
initial agent opening are omitted. Each learner message becomes a `VOICE`
`ConversationTurn` paired with the following agent message. A final learner
message without a response is persisted as `FAILED` with a null assistant text,
matching the existing evaluation rule that evaluates only completed turns.
Deterministic IDs derived from conversation ID and transcript position make all
provider retries transactionally idempotent. The webhook does not start
evaluation and does not consume `post_call_audio`.

### `POST /api/v1/attempts/:attemptId/realtime-transcript`

Clerk-authenticated and owner-only. This is the immediate browser fallback for
finalized ElevenLabs SDK transcript events, so a development API that is not
publicly reachable can still persist a completed live call. The request must
include the already-bound `conversationId` and at most 20 normalized learner /
counterpart pairs. The API verifies that the ID belongs to this active
`REALTIME` attempt, assigns deterministic IDs scoped to that conversation,
persists `VOICE` turns transactionally, and marks the mapping imported. A
replayed request is a no-op. The endpoint never logs transcript text.

The first successful import wins: a later webhook sees the imported marker and
does not append a second copy. A conversation ID bound to another attempt is
indistinguishable from a missing attempt (`404 NOT_FOUND`).

An attempt with a bound conversation cannot finish until its canonical
transcript has imported. This prevents an asynchronous provider callback or
browser save from being omitted from the frozen evaluation transcript. Finish
returns `409 REALTIME_TRANSCRIPT_PENDING` while that import remains pending;
the UI keeps the transcript and retries its authenticated save before Finish.

### `POST /api/v1/realtime/scenario-context`

ElevenLabs-agent-only. Not Clerk-authenticated. Protected by:

```text
x-kalemny-tool-secret: <ELEVENLABS_TOOL_SECRET>
x-kalemny-context-token: <signed context token>
```

Missing or wrong tool secret returns `401 UNAUTHENTICATED`. Missing, invalid,
expired, or attempt-less context tokens return `404 NOT_FOUND` without
revealing why.

The backend loads the attempt, resolves its stored `variationId`, difficulty,
and scenario version server-side, and returns the hidden realtime roleplay
context (the same content the text roleplay system prompt uses, including the
variation counterpart brief and interview session plan). This response is for
the voice agent only and must never be returned to the browser.
