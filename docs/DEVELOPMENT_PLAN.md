# DEVELOPMENT_PLAN.md

## Goal

Implement Release 1 safely and incrementally by completing one working vertical slice first, then layering remaining P0 features.

**Current phase:** Development  
**Deadline:** September 3, 2026

Primary specs:

```text
/AGENTS.md
/docs/PROJECT_STATE.md
/docs/PRODUCT_REQUIREMENTS.md
/docs/ARCHITECTURE.md
/docs/DATABASE_DESIGN.md
/docs/API_CONTRACT.md
/docs/AI_DESIGN.md
```

---

## Global Rules

- Do not change approved scope/architecture without a concrete blocker.
- Work milestone-by-milestone.
- Keep changes small and reviewable.
- Write tests for critical domain behavior as it is implemented.
- Run typecheck/lint/tests before declaring a milestone complete.
- Never log transcripts, prompts, audio, tokens, or secrets.
- Do not start a later milestone before the current exit criteria pass.
- Update `PROJECT_STATE.md` after meaningful milestone changes.
- Commit stable milestones frequently.

---

# Stage 1 — Core Vertical Slice

Target:

```text
Auth
→ Salary Negotiation / Medium
→ Text Conversation
→ Finish
→ Evaluation
→ Persisted Results
```

This must work before voice, history, progress, or other scenarios.

---

## Milestone 1 — Repository Foundation

Deliver:

- pnpm workspace;
- `apps/web`;
- `apps/api`;
- `packages/contracts`;
- Prisma directory;
- strict TypeScript;
- lint/format/test scripts;
- environment validation;
- basic API health route.

Exit criteria:

- web starts locally;
- API starts locally;
- shared package imports correctly;
- typecheck/lint pass.

---

## Milestone 2 — Authentication + Database

Deliver:

- Clerk in Next.js;
- Clerk verification in Express;
- lazy local User provisioning;
- Neon/PostgreSQL connection;
- initial Prisma models/migration;
- ownership-safe user foundation.

Exit criteria:

- authenticated frontend calls protected API;
- unauthenticated call is rejected;
- local User is created once;
- database migration succeeds.

---

## Milestone 3 — Scenario System

Deliver:

- scenario definition Zod contract;
- Salary Negotiation v1;
- Easy/Medium/Hard configuration;
- seed/sync logic;
- public scenario retrieval endpoints;
- hidden configuration backend-only.

Initial implementation only needs Salary Negotiation.

Exit criteria:

- active scenario can be fetched;
- hidden persona/rubric fields never reach client;
- scenario version persists correctly.

---

## Milestone 4 — Attempt Lifecycle

Deliver:

- create/read attempts;
- ownership checks;
- lifecycle states;
- expiry/session limits;
- `ConversationTurn`;
- client idempotency;
- pending/completed/failed turn behavior.

Exit criteria:

- user can create Salary Negotiation / Medium attempt;
- another user cannot access it;
- duplicate `clientRequestId` does not create duplicate turns;
- invalid lifecycle transitions are rejected.

---

## Milestone 5 — Text Roleplay

Deliver:

- `AiService`;
- `OpenRouterProvider` as the single Release 1 provider;
- explicit environment-selected model IDs; no automatic model routing;
- roleplay prompt v1;
- transcript/context assembly;
- model timeout handling;
- failed-response retry;
- AI usage metadata.

Exit criteria:

- learner sends text;
- AI answers in character;
- accepted learner text survives provider failure;
- retry does not duplicate learner turn;
- no transcript/prompt content appears in logs.

---

## Milestone 6 — Evaluation Pipeline

Deliver:

- universal rubric;
- Salary Negotiation objectives;
- structured evaluation contract;
- Zod validation;
- turn/objective reference validation;
- one controlled retry;
- deterministic 70/30 scoring;
- canonical Evaluation persistence.

Exit criteria:

- finished transcript becomes immutable;
- valid evaluation is persisted once;
- invalid evidence references are rejected;
- overall score is calculated by backend;
- completed evaluation survives page refresh.

---

## Milestone 7 — Results Experience

Deliver:

- results page;
- five skill scores;
- scenario objectives;
- strengths/improvements;
- evidence-linked moments;
- stronger response;
- next focus;
- loading/error/evaluation-recovery states.

Exit criteria:

```text
Auth
→ Scenario
→ Attempt
→ Conversation
→ Finish
→ Evaluation
→ Results
```

works end-to-end locally and in staging.

**Stage 1 complete only here.**

---

# Stage 2 — Complete P0 Learning Loop

## Milestone 8 — Retry + Comparison

Deliver:

- retry relationship;
- same scenario/difficulty default;
- immutable previous attempt;
- deterministic score/skill/objective comparison.

Exit criteria:

- Attempt B never overwrites Attempt A;
- same-difficulty comparison is correct;
- cross-difficulty comparison is marked non-equivalent.

---

## Milestone 9 — History + Progress

Deliver:

- history endpoint/page;
- latest-five progress calculation;
- weakest skill;
- deterministic scenario recommendation;
- session deletion.

Exit criteria:

- only eligible sessions affect progress;
- deletion recalculates progress naturally;
- user can reopen historical results.

---

# Stage 3 — Voice

## Milestone 10 — Push-to-Talk STT

Deliver:

- MediaRecorder;
- microphone permission states;
- transcription endpoint;
- editable transcript composer;
- MIME/size/duration validation;
- text fallback.

Exit criteria:

- speech becomes editable text;
- audio is not persisted;
- microphone/STT failure never blocks simulation.

---

## Milestone 11 — Optional TTS

Deliver:

- stored assistant-text speech endpoint;
- temporary browser playback;
- TTS failure handling.

Exit criteria:

- AI text appears independently of audio;
- generated audio is not persisted;
- failed TTS does not affect turn state.

---

# Stage 4 — Content + Stabilization

## Milestone 12 — Remaining Scenarios

Add:

1. Behavioral interview
2. Promotion request
3. Manager pushback
4. Difficult teammate feedback
5. Scope creep / saying no

For every scenario:

- validate definition;
- seed immutable version;
- test Easy/Medium/Hard manually;
- verify scenario objectives/evaluation.

Exit criteria:

- all six scenarios complete the core loop;
- difficulty differences are meaningful.

---

## Milestone 13 — P0 Hardening

Deliver:

- responsive states;
- accessibility fundamentals;
- centralized errors;
- rate limits;
- timeout configuration;
- privacy-safe logging;
- Sentry;
- AI usage/cost tracking;
- empty/loading/error states.

Exit criteria:

- all P0 requirements implemented;
- no known release-blocking Development defects;
- staging core-loop smoke test passes.

Then freeze features and move formally to **Testing**.

---

# Per-Milestone Workflow

For each milestone:

```text
1. Read relevant source-of-truth docs
2. Define the smallest reviewable task
3. Write/adjust tests for critical behavior
4. Implement only that task
5. Run focused tests
6. Run full typecheck/lint/relevant tests
7. Review diff against docs
8. Fix findings
9. Commit
10. Update PROJECT_STATE.md when project state changes
11. Start next task/milestone
```

Never let an agent implement multiple future milestones “while it is already there.”

---

# Review Gates

Before accepting a milestone verify:

### Spec
- matches approved requirements;
- no unapproved scope;
- architecture invariants preserved.

### Code
- strict TypeScript;
- focused modules/files;
- no unnecessary abstractions;
- errors handled centrally;
- no secrets/client trust issues.

### Tests
- critical domain logic covered;
- authorization tested where relevant;
- failure/state transitions tested;
- AI tests validate contracts/invariants, not exact wording.

### Privacy
- no transcripts/prompts/audio in normal logs;
- no AI secrets in frontend.

---