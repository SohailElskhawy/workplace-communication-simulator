# Text Roleplay Implementation Plan

> **For agentic workers:** Implement inline in the prepared `milestone/05-text-roleplay` workspace. The repository explicitly prohibits TDD; add focused tests alongside each implementation unit.

**Goal:** Complete Milestone 5 with privacy-safe OpenRouter text roleplay, same-turn failure retry, and safe AI usage tracking.

**Architecture:** Extend the existing attempt application service at its post-persistence seam. A small `AiService` builds the versioned roleplay prompt from backend-only scenario data and delegates one fixed-model chat request to `OpenRouterProvider`; repository finalization methods atomically update the turn and store safe usage metadata after the external call has ended.

**Tech Stack:** TypeScript, Express, Prisma/PostgreSQL, Zod, Vitest, native `fetch`/`AbortController`.

**Specs:** `docs/AI_DESIGN.md`, `docs/API_CONTRACT.md`, and the approved Milestone 5 request.

## Global Constraints

- Use only OpenRouter with `provider.zdr=true` and `provider.data_collection="deny"`.
- Use the exact environment-configured roleplay model; never use automatic model routing.
- Never log prompts, transcripts, messages, credentials, raw upstream payloads, or sensitive provider errors.
- Persist learner text before the AI request and keep network calls outside database transactions.
- Duplicate `clientRequestId` requests return the existing turn without another provider call.
- Retry a failed response on the same `ConversationTurn` only while its attempt remains `ACTIVE`.
- Do not implement evaluation, scoring, voice, history, progress, streaming, or additional scenarios.

---

### Task 1: Persistence and public contracts

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260829020000_add_ai_usage_event/migration.sql`
- Modify: `packages/contracts/src/attempt.ts`
- Modify: `packages/contracts/src/index.ts`

- [ ] Add `AiUsageEvent` enums/model, relations, indexes, and cascading attempt/user ownership.
- [ ] Add the strict failed-turn retry response contract without introducing a client transcript input.
- [ ] Generate Prisma and run contract/schema-focused checks.

### Task 2: Roleplay prompt and OpenRouter boundary

**Files:**
- Create: `apps/api/src/modules/ai/roleplay-prompt.ts`
- Create: `apps/api/src/modules/ai/openrouter-provider.ts`
- Create: `apps/api/src/modules/ai/ai-service.ts`
- Add focused adjacent tests.

- [ ] Build chronological prompt messages from a validated backend scenario, difficulty, previous completed turns, and the persisted current learner text.
- [ ] Implement one fixed-model OpenRouter chat request with ZDR/data-collection restrictions, timeout cancellation, runtime response validation, optional usage/cost parsing, and sanitized typed errors.
- [ ] Keep provider details encapsulated behind `AiService.generateRoleplayReply`.

### Task 3: Turn completion, failure, retry, and usage tracking

**Files:**
- Modify: `apps/api/src/modules/attempts/attempt-service.ts`
- Modify: `apps/api/src/modules/attempts/prisma-attempt-repository.ts`
- Modify: `apps/api/src/modules/attempts/attempt-errors.ts`
- Modify: `apps/api/src/modules/attempts/attempt-routes.ts`
- Modify: `apps/api/src/modules/attempts/*.test.ts`

- [ ] Finalize created turns as `COMPLETED` or `FAILED` after the provider call and create one safe `ROLEPLAY` usage event for either outcome.
- [ ] Ensure existing turns bypass generation and retry transitions only the owned failed turn back to `PENDING` without creating a row.
- [ ] Expose stable 502/504 errors and the owner-only retry endpoint; verify ownership, state, idempotency, context order, malformed responses, and error sanitization.

### Task 4: Runtime wiring and configuration

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/src/config/env.test.ts`
- Modify: `apps/api/src/server.ts`
- Modify: `.env.example`

- [ ] Add `ROLEPLAY_PROMPT_VERSION=roleplay-v1`, retain all supplied environment configurability, and reject unsupported prompt versions or automatic model routing.
- [ ] Wire the single provider and AI service into the attempt service.

### Task 5: Verification and project state

**Files:**
- Modify: `docs/PROJECT_STATE.md`

- [ ] Run typecheck, lint, all tests, build, format check, Prisma validation/generation, and migration diff validation as applicable.
- [ ] If a real `OPENROUTER_API_KEY` is present, run one Salary Negotiation / Medium smoke request; otherwise record it pending without exposing the value.
- [ ] Record Milestone 5 status, evidence, remaining issues, exit criteria, and Milestone 6 as the next task.
