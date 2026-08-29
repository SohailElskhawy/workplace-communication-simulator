# Milestone 4 Attempt Lifecycle Implementation Plan

> **For agentic workers:** Execute inline in this workspace. Do not use TDD; `AGENTS.md` explicitly prohibits it. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist ownership-scoped simulation attempts and learner turns with approved lifecycle, expiry, limits, idempotency, and finish behavior.

**Architecture:** Shared Zod contracts define frontend-safe HTTP shapes. An attempt service owns deterministic decisions and delegates atomic concurrency-sensitive work to a Prisma repository; Express routes own authentication, validation, and stable error mapping.

**Tech Stack:** TypeScript 6, Express 5, Zod 4, Prisma 7, PostgreSQL, Vitest, Supertest

**Spec:** `docs/superpowers/specs/2026-08-29-attempt-lifecycle-design.md`

## Global Constraints

- Implement only Milestone 4; no OpenAI, evaluation generation, voice, history, progress, comparison, or deletion.
- Preserve all existing uncommitted Milestone 3 work.
- Never accept authoritative user identity from request data.
- Never expose hidden scenario definition fields or transcript content in logs.
- Session expiry is 15 minutes and learner-turn limit is 20.
- Tests are written alongside implementation, not test-first.

---

### Task 1: Prisma Attempt and Turn Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260829010000_create_attempt_lifecycle/migration.sql`

**Interfaces:**
- Produces Prisma models `SimulationAttempt` and `ConversationTurn`.
- Produces enums `Difficulty`, `AttemptStatus`, `InputMethod`, and `TurnStatus`.
- Produces DB invariants used by repository transactions.

- [ ] **Step 1: Extend Prisma schema**

Add relations from `User` and `Scenario`, then define attempt and turn fields exactly from `DATABASE_DESIGN.md`. Use `onDelete: Cascade` for owner/turn relations, `onDelete: Restrict` for immutable scenario versions, and `onDelete: SetNull` for retry source.

- [ ] **Step 2: Add migration SQL**

Create enum types, tables, FKs, approved indexes, unique `(attemptId, sequence)` and `(attemptId, clientRequestId)` constraints, a `sequence >= 1` check, and:

```sql
CREATE UNIQUE INDEX "ConversationTurn_one_pending_per_attempt"
ON "ConversationTurn" ("attemptId")
WHERE "status" = 'PENDING';
```

- [ ] **Step 3: Generate and validate Prisma client**

Run `corepack pnpm prisma:generate` and `corepack pnpm prisma:validate`.

---

### Task 2: Shared Attempt Contracts

**Files:**
- Create: `packages/contracts/src/attempt.ts`
- Create: `packages/contracts/src/attempt.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Produces `CreateAttemptRequestSchema`, `CreateAttemptResponseSchema`, `AttemptDetailResponseSchema`, `CreateTurnRequestSchema`, `TurnResponseSchema`, and `FinishAttemptResponseSchema`.
- Produces inferred request/response and DTO types for API code.

- [ ] **Step 1: Define strict Zod contracts**

Use UUIDs for resource IDs, trim and bound user text, require a bounded client request ID, reuse `DifficultySchema`, accept `TEXT | VOICE`, and represent all approved attempt/turn states. Serialize timestamps as ISO datetime strings.

- [ ] **Step 2: Export contracts**

Re-export schemas and types through `packages/contracts/src/index.ts`.

- [ ] **Step 3: Test contract boundaries**

Cover valid payloads, blank text, malformed UUIDs, invalid enums, and frontend-safe response parsing.

---

### Task 3: Attempt Domain Service and Repository

**Files:**
- Create: `apps/api/src/modules/attempts/attempt-errors.ts`
- Create: `apps/api/src/modules/attempts/attempt-service.ts`
- Create: `apps/api/src/modules/attempts/prisma-attempt-repository.ts`
- Create: `apps/api/src/modules/attempts/attempt-service.test.ts`

**Interfaces:**
- `createAttemptService(repository, clock)` returns `create`, `getOwned`, `createTurn`, and `finish` operations.
- Repository create input includes authoritative `userId`, active `scenarioKey`, difficulty, optional retry source, `startedAt`, and `expiresAt`.
- Repository new-turn input includes `attemptId`, `userId`, `clientRequestId`, text, input method, and server time.
- Expected failures use `AttemptError` with stable code and HTTP status.

- [ ] **Step 1: Implement domain errors and mapping data types**

Define safe errors for `NOT_FOUND`, `INVALID_ATTEMPT_STATE`, `SESSION_LIMIT_REACHED`, and `TURN_ALREADY_PENDING` without learner text.

- [ ] **Step 2: Implement deterministic service behavior**

Calculate expiry with `15 * 60 * 1000`, trim accepted text, pass authoritative identity, and map records to public DTOs. Parse scenario definition only to extract the opening message.

- [ ] **Step 3: Implement atomic Prisma repository operations**

Ownership-scope all reads. Use transactions and a row lock for new turns and finish. Check duplicate client request before state/limit checks. Allocate `sequence = count + 1`; enforce 20-turn maximum and pending exclusion. Map expected unique-race failures back to idempotent return or `TURN_ALREADY_PENDING`.

- [ ] **Step 4: Test lifecycle rules with a focused in-memory repository**

Cover foreign resources as `NOT_FOUND`, retry ownership/scenario rules, 15-minute boundary, 20-turn ceiling, duplicate client request return, pending exclusion, non-active turn rejection, zero-turn finish, one-turn finish, and repeated finish.

---

### Task 4: Authenticated Attempt Routes and Runtime Wiring

**Files:**
- Create: `apps/api/src/modules/attempts/attempt-routes.ts`
- Create: `apps/api/src/modules/attempts/attempt-routes.test.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/app.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Registers `POST /api/v1/attempts`, `GET /api/v1/attempts/:attemptId`, `POST /api/v1/attempts/:attemptId/turns`, and `POST /api/v1/attempts/:attemptId/finish`.
- Uses existing `resolveAuthProviderUserId` and `LocalUserProvisioner` dependencies.
- Returns common `{ data }` success and stable `{ error }` failure envelopes.

- [ ] **Step 1: Implement route validation and authentication**

Validate bodies and UUID params with Zod. Reject missing authentication before provisioning. Provision local user, then call service with its ID. Return `201` for newly created attempts/turns and `200` for reads, idempotent turn returns, and finish.

- [ ] **Step 2: Register routes and production dependencies**

Add attempt service to `createApp` dependencies, register routes after scenarios, and construct Prisma repository/service in `server.ts`.

- [ ] **Step 3: Add endpoint tests**

Cover unauthenticated access, validation failures, owner identity propagation, status/error mapping, idempotent turn HTTP behavior, ordered safe attempt responses, and finish responses. Keep existing health/auth/scenario tests working by supplying an unused attempt service stub.

---

### Task 5: Full Verification and Project State

**Files:**
- Modify after verification: `docs/PROJECT_STATE.md`

- [ ] **Step 1: Run focused tests**

Run attempt and contract test files directly and fix failures.

- [ ] **Step 2: Run full requested checks**

Run:

```text
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
corepack pnpm prisma:validate
corepack pnpm prisma:generate
corepack pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

- [ ] **Step 3: Review requirements and migration diff**

Confirm ownership hiding, lifecycle behavior, limit boundaries, idempotency ordering, partial pending index, and absence of out-of-scope integrations.

- [ ] **Step 4: Update operational source of truth**

Only after every required check passes, update `docs/PROJECT_STATE.md` to mark Milestone 4 complete, list implemented behavior, record verification commands/date, and set Milestone 5 text roleplay as next task.
