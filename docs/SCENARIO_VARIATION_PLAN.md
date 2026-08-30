# Scenario Variation Plan

Curated per-attempt scenario variation across all 6 scenarios. Same scenario,
objectives, evaluation model, and difficulty system; only conversation content
varies. No extra AI call — variations are curated configuration, not generated.

## 1. Current State (verified)

- `apps/api/src/modules/scenarios/definitions/*.ts` — 6 definitions, each with
  one fixed `openingMessage`, one persona/`aiObjective`/`constraints` set.
- `AttemptService.create` resolves the active `Scenario` row by key and returns
  `definition.openingMessage`. Retry validates same user + same scenario key;
  nothing per-attempt beyond `retryOfAttemptId` is stored.
- `buildRoleplayMessages` (roleplay-v1) seeds `scenario.openingMessage` as the
  first assistant message and builds the system prompt from the definition +
  difficulty axes.
- `buildEvaluationMessages` receives `publicContext.description` as
  "Situation" but **never sees the opening message**. A varied interview
  question would be invisible to the evaluator judging `RELEVANT_EXAMPLE`
  ("directly addresses the question").
- `syncScenarioDefinitions` deep-compares definitions and throws on in-place
  edits ("Create a new version instead") — variation content must ship as v2.

## 2. Design Decisions

| Question | Decision |
| --- | --- |
| Where do variations live? | Inside the scenario `definition` JSONB, as an optional `variations[]` array. Versioned and immutable with the scenario; no new table. |
| DB/schema change? | **Yes, minimal**: one nullable `variationId String?` column on `SimulationAttempt`. No FK (references config inside JSONB, not a row). |
| Extra AI call? | None. Selection is a pure function over curated config; interview follow-ups and question progression happen inside the existing single roleplay call. |
| Retry behavior | New attempt always re-selects; excludes the retry source's variation when the pool has more than one. |
| Question-level state | None persisted. Only `variationId` is stored on `SimulationAttempt`; the transcript records which questions were actually asked. |
| Client-facing contract | No change required. `openingMessage` in attempt responses simply reflects the selected variation. |

Rejected alternative: deriving the variation deterministically from
`hash(attemptId) % pool` with no DB column. Rejected because it cannot
guarantee a retry differs, cannot be displayed/debugged, and makes selection
implicit.

## 3. Data / Config Shape

Extend `ScenarioDefinitionSchema` (all fields optional-preserving; definitions
without `variations` keep working):

```text
ScenarioVariation {
  id               string slug, unique within the scenario   // e.g. "tight-budget"
  category         string                                    // variation/track theme, e.g. "TIGHT_BUDGET"
  openingMessage   string (required)                         // varied opening / first interview question
  situation        string (optional)                         // overrides publicContext.description
  counterpartBrief string (optional)                         // hidden variation context:
                                                             // objections, constraints, reactions,
                                                             // follow-up angles
  interviewTrack   InterviewTrack (optional)                 // behavioral interview only
}

InterviewTrack {
  questions: [{ category, question }]   // 3–5 ordered questions across distinct categories
}

InterviewQuestionCategory (enum):
  INTRODUCTION, EXPERIENCE, TEAMWORK_CONFLICT, OWNERSHIP,
  PROBLEM_SOLVING, FAILURE_LEARNING, ADAPTABILITY, REFLECTION

definition.variations: ScenarioVariation[] (optional, min 1; recommend 3–5)
```

Validation rules for `interviewTrack` (Zod refine):
- 3–5 questions; categories distinct within a track;
- `questions[0].question === openingMessage` — the opening is the track's
  first question, so there is no duplicated source of truth.

- `category` is the variation/track theme label used for rotation and ops
  debugging; not exposed to clients. Per-question categories live in the track.
- `counterpartBrief` is injected as one prompt section — simplest way to vary
  objections/constraints/reactions/follow-ups without restructuring the
  roleplay template.
- Behavioral interview: each variation is a curated **interview track** — one
  opening question plus 2–4 subsequent planned questions across different
  competency categories. The AI advances through the track conversationally
  during the session; the transcript itself records which questions were asked,
  so no question-level state is persisted.

## 4. Selection Logic

Pure, testable function (no AI, no DB read):

```text
selectScenarioVariation(definition, { excludeVariationId?, random })
  → variations absent/empty  → null (current behavior, backward compatible)
  → pool minus excluded (when pool > 1) → uniform random pick
  → pool of 1 → that variation
```

- Called in `AttemptService.create` after parsing the active definition.
- Retry path: the repository already loads the retry source; extend its select
  to include `variationId` and pass it as `excludeVariationId`.
- Selected `variationId` is persisted on the attempt at creation → stable for
  the attempt's lifetime, including turn regeneration and failed-turn retry.
- Selecting an interview track is the same act as selecting the variation —
  no question-level selection or persistence happens in application code.
- `generateRoleplayReply` / evaluation resolve the effective scenario from
  `attempt.scenario.definition` + `attempt.variationId`. Unknown/missing id
  (e.g. pre-migration attempts) falls back to the base definition.

## 5. Roleplay Prompt / Context Changes

- New pure resolver `resolveScenarioVariation(definition, variationId)` →
  `{ scenario, variation | null }` (or an effective-definition object).
- `buildRoleplayMessages`:
  - seed the first assistant message from `variation.openingMessage` when
    present (else base `openingMessage`);
  - add an optional "Session plan" section after Constraints rendering
    `interviewTrack.questions` as an ordered list with categories, followed by
    the interview conduct rules below;
  - add an optional "This conversation" section containing `counterpartBrief`;
  - bump `ROLEPLAY_PROMPT_VERSION` to `roleplay-v2`.
- `AttemptService.create` response and `mapScenario` (attempt detail) must
  return the variation's opening message.
- Difficulty system untouched — variation content composes with the existing
  five behavioral axes and `behaviorGuidance`.

Interview conduct rules (rendered with the session plan; generic scenarios are
unaffected):

- open with the track's opening question;
- ask natural follow-ups based on the learner's actual answer before moving on;
- move to the next planned question/category once the current one is
  sufficiently explored;
- treat the plan as flexible guidance, not a script: skip questions when the
  flow or remaining turn budget dictates; never ask every question mechanically;
- never repeat an already-answered question except to clarify;
- difficulty modulates follow-up pressure and challenge through the existing
  behavioral axes — no per-difficulty question banks.

Follow-ups and question progression happen inside the existing single roleplay
call — no extra AI call for question selection. Pacing relies on static
guidance plus the existing 20-turn session limit; injecting live turn counts is
an optional later refinement, not Release 1 scope.

## 6. Evaluation Context Change (required)

The evaluator must see the varied opening/question, otherwise objectives like
`RELEVANT_EXAMPLE` are judged blind:

- `EvaluationPromptInput` gains the effective situation (variation override or
  base) and the variation opening message; render them in SCENARIO INF
- Interview questions asked after the opening appear in the transcript as
  assistant messages, so the evaluator already sees them; only the opening
  question must be supplied explicitly.ORMATION.
- Bump `EVALUATION_PROMPT_VERSION` to `evaluation-v2`.
- Objectives, rubric, scoring, and reference validation are unchanged.

## 7. Scenario Versioning Strategy

- Variations are part of the immutable definition → adding them is a behavior
  change → **bump all 6 scenarios to v2**; v1 rows remain for historical
  attempts (existing immutability guard enforces this automatically).
- `definitions/index.ts` exports the v2 definitions as the active set;
  `prisma/seed.ts` / sync sets them active. No sync-logic change needed.
- Future content tweaks = new version (v3), never in-place edits.

## 8. Implementation Passes

1. **Foundation** — variation schema + resolver + selection function;
   Prisma column + migration; repository/service wiring (persist `variationId`,
   retry exclusion, opening-message mapping); unit tests.
2. **Prompt integration** — roleplay + evaluation prompt changes (session-plan
   rendering, interview conduct rules), prompt version bumps, `ai-service`
   input passthrough; unit tests.
3. **Curated content** — v2 definitions for all 6 scenarios: behavioral
   interview tracks (4–6 tracks, each 3–5 questions across distinct
   categories); 3–4 variations per other scenario covering distinct openings,
   objections, constraints, reactions, follow-ups; sync verification against a
   real/dev DB.
4. **Docs & verification** — update `AI_DESIGN.md` (§5, §7), `DATABASE_DESIGN.md`
   (§6), `PROJECT_STATE.md`; run typecheck/lint/tests; end-to-end smoke of
   create → turns → finish → evaluate → retry.

## 9. Tests

- `scenario-definition` / new variation module: schema validation, unique
  variation ids, `interviewTrack` rules (3–5 questions, distinct categories,
  opening matches `questions[0]`), selection (exclusion, pool of 1,
  no-variations fallback, determinism with injected rng).
- `attempt-service`: create persists `variationId` and returns the variation
  opening; retry excludes the source variation; turn generation receives the
  variation-merged scenario; old attempts without `variationId` still work.
- session plan + conduct rules rendered for interview tracks; generic
  scenarios render unchanged; prompt version bump.
- `evaluation-prompt`: effective situation + variation opening rendered.
- No question-state persistence tests — none exists by design; the transcript
  is the record of which questions were ask
- `evaluation-prompt`: effective situation + variation opening rendered.
- `prisma-attempt-repository`: `variationId` round-trip; retry source select
  includes `variationId`.
- `sync-scenarios`: v2 definitions sync cleanly; in-place-edit guard still
  rejects v1 mutation.

## 10. Files Likely Affected

```text
prisma/schema.prisma                                          (variationId on SimulationAttempt)
prisma/migrations/<new>_add_attempt_variation/migration.sql   (new)

apps/api/src/modules/scenarios/scenario-definition.ts         (variation schema)
apps/api/src/modules/scenarios/scenario-variation.ts          (new: resolver + selection)
apps/api/src/modules/scenarios/definitions/*.ts               (v2 content, 6 files)
apps/api/src/modules/scenarios/definitions/index.ts           (export v2 set)

apps/api/src/modules/attempts/attempt-service.ts              (selection, wiring, mapScenario)
apps/api/src/modules/attempts/prisma-attempt-repository.ts    (persist/select variationId)
apps/api/src/modules/ai/roleplay-prompt.ts                    (variation section, v2 bump)
apps/api/src/modules/ai/evaluation-prompt.ts                  (effective situation, v2 bump)
apps/api/src/modules/ai/ai-service.ts                         (input passthrough)
apps/api/src/modules/evaluations/evaluation-service.ts        (pass variation context)

tests: scenario-definition.test.ts, scenario-variation.test.ts (new),
attempt-service.test.ts, prisma-attempt-repository.test.ts,
roleplay-prompt.test.ts, evaluation-prompt.test.ts, sync-scenarios.test.ts

docs: AI_DESIGN.md, DATABASE_DESIGN.md, PROJECT_STATE.md
```

`packages/contracts` needs no change (openingMessage is already optional in
`AttemptScenarioSchema`); expose `variationId` later only if the UI needs it.

## 11. Risks / Notes

- Content volume is the main cost; keep 3–4 variations per scenario for
  Release 1 and expand later via new versions.
- `counterpartBrief` must respect role-integrity rules (no rub
- Track adherence is prompt-driven: the model could skip too many questions or
  ask them mechanically. Mitigated by the conduct rules and difficulty axes;
  validate with sample transcripts during implementation and tune wording in a
  future scenario version if needed (never in-place).
- Session budget: 3–5 questions with follow-ups must fit the 20-turn limit;
  tracks are sized so a ~4-question interview completes comfortably, and the
  plan explicitly permits skipping.ric leakage); it
  is backend-only and never returned to clients.
- Random selection needs no seeding/state; retries are the only exclusion rule,
  matching "new variation by default" without new API surface.
