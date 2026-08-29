# Milestone 4 Attempt Lifecycle Design

## Scope

Milestone 4 adds persistence and authenticated REST behavior for simulation attempts and learner conversation turns. It includes attempt creation, attempt retrieval, learner-turn acceptance, and attempt finishing. It does not call an AI provider or implement roleplay replies, evaluation generation, voice, history, progress, retry comparison, or deletion.

The implementation follows `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, and `API_CONTRACT.md`. The initial vertical slice uses the active Salary Negotiation scenario and Medium difficulty, while domain contracts retain the approved difficulty enum.

## Persistence

Prisma will define `SimulationAttempt` and `ConversationTurn` plus the approved `Difficulty`, `AttemptStatus`, `InputMethod`, and `TurnStatus` enums.

`SimulationAttempt` belongs to one `User` and one immutable `Scenario` version. Its optional self-reference records a retry source. Deleting a user cascades to owned attempts, deleting a referenced scenario version is restricted, and deleting a retry source sets descendants' `retryOfAttemptId` to null. Attempts store lifecycle timestamps, a 15-minute expiry, progress eligibility, and evaluation-start metadata needed by later milestones.

`ConversationTurn` belongs to one attempt and stores one accepted learner input. Database constraints enforce unique sequence numbers, unique `(attemptId, clientRequestId)` idempotency keys, `sequence >= 1`, and at most one `PENDING` turn per attempt through a PostgreSQL partial unique index. Deleting an attempt cascades to its turns.

## API Contracts

Shared Zod contracts will validate and type:

- `POST /api/v1/attempts` requests and responses;
- `GET /api/v1/attempts/:attemptId` responses;
- `POST /api/v1/attempts/:attemptId/turns` requests and responses;
- `POST /api/v1/attempts/:attemptId/finish` responses.

Responses expose only public scenario identity and stored transcript fields. Hidden scenario definition content remains backend-only. Invalid JSON bodies return `VALIDATION_FAILED`; missing or non-owned attempts return `NOT_FOUND`.

## Application Boundaries

An attempt route module owns HTTP parsing and response mapping. An attempt service owns authorization-safe orchestration and deterministic lifecycle rules. A Prisma repository owns database reads, writes, and concurrency-sensitive transactions. Time is injected into the service so expiry behavior is deterministic in tests.

Routes derive the Clerk user ID from authenticated request state, lazily provision the local user, and never accept an authoritative user ID from clients.

## Create and Read Behavior

Creating an attempt requires an active scenario. If `retryOfAttemptId` is supplied, the source must belong to the current user and have the same scenario key; the new attempt still references the currently active immutable version. A new attempt starts as `ACTIVE`, with `startedAt` set from the server clock and `expiresAt` exactly 15 minutes later. The response includes the configured opening message but does not persist it as a learner `ConversationTurn`.

Attempt reads are ownership-scoped in the database query. They return ordered turns, public scenario identity, lifecycle metadata, and `evaluation: null` until evaluation persistence exists.

## Turn Acceptance and Idempotency

Turn requests require non-empty trimmed text, a client request ID, and an approved input method. Idempotency lookup occurs before lifecycle and session-limit checks. A repeated `(attemptId, clientRequestId)` returns the existing logical turn even if the attempt later expires or leaves `ACTIVE`.

For a new request, the repository transaction locks the owned attempt row, verifies `ACTIVE`, checks `currentTime < expiresAt`, verifies fewer than 20 learner turns, rejects an existing pending turn, allocates the next sequence, and stores a `PENDING` turn. Database uniqueness constraints provide final protection against races.

Because roleplay is excluded from Milestone 4, the endpoint returns the accepted `PENDING` turn. Milestone 5 will generate an assistant reply and update this same row to `COMPLETED` or `FAILED`; it must not create a second learner turn.

## Finish Lifecycle

Finishing locks the owned attempt and applies one atomic transition:

- `ACTIVE` with zero learner turns becomes `ABANDONED`;
- `ACTIVE` with one or more learner turns becomes `EVALUATING`;
- repeated finish calls on a non-`ACTIVE` attempt return its current state without starting other work.

Both transitions set `endedAt`; the `EVALUATING` transition also sets `evaluationStartedAt`. No new turns are accepted after either transition. Arbitrary state changes are not exposed through the API.

## Error Handling

Stable application errors map to approved HTTP semantics:

- malformed requests: `400 VALIDATION_FAILED`;
- missing active scenario or missing/non-owned attempt: `404 NOT_FOUND`;
- non-active attempt for a new turn: `409 INVALID_ATTEMPT_STATE`;
- expired or 20-turn session: `409 SESSION_LIMIT_REACHED`;
- existing pending turn: `409 TURN_ALREADY_PENDING`.

Expected application errors use safe response bodies. Unexpected failures flow to centralized handling without logging transcript or prompt content.

## Tests and Verification

Focused tests will cover ownership hiding, retry ownership/scenario validation, lifecycle transitions, finish idempotency, expiry, the 20-turn ceiling, pending-turn exclusion, client-request idempotency, request validation, and public response safety. Tests are written alongside implementation rather than with TDD, as required by `AGENTS.md`.

Completion requires fresh successful runs of typecheck, lint, tests, build, formatting check, Prisma validation, Prisma generation, and migration diff validation from an empty PostgreSQL schema. `PROJECT_STATE.md` changes only after these checks pass.
