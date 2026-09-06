# AGENTS.md

## Project

**AI Workplace Communication Simulator** — production-quality MVP; original target **September 3, 2026** (historical). Redesign delivery date is not yet set.

Core loop:

`Scenario → Simulation → Evaluation → Coaching → Retry → Improvement`

Primary users: students and early-career professionals practicing difficult workplace conversations.

Release 1 targets the full **English and Arabic** experience. Arabic interface copy uses friendly Modern Standard Arabic; practice supports Egyptian/Gulf dialects. See the approved September 6 redesign below.

## Current SDLC State

- Planning: approved
- Analysis: approved
- Design: approved
- Development: current phase

Do not silently change approved product scope or architecture. If a requested implementation conflicts with the source-of-truth docs, report the conflict before changing behavior.

## Read Before Coding

Start with the current status and next task in `PROJECT_STATE.md`. Then read the task-relevant sections of these sources in the order below. This is a reference map, not a requirement to dump every document into context. Read complete governing sections and expand when dependencies or conflicts require it.

1. `docs/PROJECT_STATE.md` — current phase, completed work, next task, known issues
2. `docs/PRODUCT_REQUIREMENTS.md` — product behavior and acceptance criteria
3. `docs/ARCHITECTURE.md` — system structure and architectural invariants
4. `docs/DATABASE_DESIGN.md` — persistence model and constraints
5. `docs/API_CONTRACT.md` — REST contracts and lifecycle rules
6. `docs/AI_DESIGN.md` — prompts, evaluation, structured output, AI safeguards
7. `docs/DESIGN.md` and `docs/WARM_CORAL_DESIGN.md` — approved Concept A and mobile correction
8. `docs/REDESIGN_PLAN.md` and `docs/REDESIGN_TECHNICAL_DECISIONS.md` — active milestones and current/target distinctions

`PROJECT_STATE.md` is the operational source of truth. Update it after completing a meaningful milestone.

## Agent Token Efficiency

The user prioritizes conserving agent usage. Apply these rules without sacrificing correctness, security, approved scope, or required verification:

- Work on the requested task or active milestone. Do not expand into unrelated cleanup, audits, redesign alternatives, or documentation rewrites.
- Use `rg` to locate relevant files/headings/symbols, then read bounded sections. Avoid whole-repository searches with unbounded output, full document dumps, generated files, lockfiles, and archived plans unless necessary.
- Reuse facts, file contents, skill instructions, and verification results already in context. Re-read only when changed, missing, or needed to resolve uncertainty. Do not repeat completed research after context compaction; use the handoff summary and current diff.
- Batch independent targeted reads/searches. Set small tool-output budgets; return relevant matches, concise errors, and summaries rather than full logs. If output truncates, narrow the query instead of repeating the dump.
- Use the smallest relevant skill/tool workflow. Avoid speculative browsing, repeated screenshots, image generation, or exhaustive option comparisons; use them when required by the task or verification.
- Do not spawn subagents or create extra tasks unless the user or applicable instructions explicitly request delegation. Do not change models or reasoning settings without authorization.
- Keep progress updates brief and useful. Final responses should normally state outcome, changed files, verification, and any blocker in a few sentences. Do not repeat the plan, user decisions, or tool chronology. Keep documentation and code clear, normal prose.
- Run focused checks appropriate to the change, then required milestone/release checks. Do not rerun passing checks without relevant changes or new evidence. Documentation-only changes normally need link/format/diff checks, not application builds or runtime tests.
- If a tool/dependency fails, inspect the decisive error and make a targeted recovery attempt. Do not loop unchanged commands, repeatedly poll unchanged state, or install dependencies solely for an optional check. Report a remaining verification gap honestly.
- Update the existing source of truth once; link to details instead of duplicating them across documents. Keep milestone handoffs compact: completed work, pending task IDs, affected paths, verification, and unresolved decisions.
- Never claim tests passed when skipped, omit critical context to save tokens, or stop authorized work early merely to reduce usage. These rules reduce avoidable work; they do not guarantee a usage-limit reduction.

## Approved Stack

- Monorepo: pnpm workspaces
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- Backend: Node.js, Express.js, TypeScript, Zod, REST
- Auth: Clerk
- Database: PostgreSQL on Neon
- ORM: Prisma
- Roleplay/evaluation/STT/custom generation: OpenRouter behind internal backend services
- TTS: existing backend Edge TTS adapter (September 5); preserve provider privacy/timeouts
- Deployment: Vercel (web), Railway (API), Neon (DB)

Release 1 model strategy:

- roleplay preferred candidate: `deepseek/deepseek-v4-flash-0731`;
- evaluation candidate: `openai/gpt-5.6-luna-pro`, pending Milestone 6 calibration;
- transcription preferred candidate: `openai/whisper-large-v3-turbo`;
- TTS: existing Edge TTS voice mapping; older Kokoro-only guidance is superseded.

Optimize every AI operation independently for quality per dollar. Judge model
changes by user-perceived quality, reliability, latency, schema/instruction
compliance, privacy compatibility, and measured cost per completed simulation.
Do not choose solely by benchmark rank or lowest token price.

Do not introduce new infrastructure or major libraries without a concrete P0 need.

## Release 1 Scope

P0 includes:

- authentication
- 6 curated scenarios
- Easy / Medium / Hard difficulty
- text conversation
- push-to-talk transcription
- optional non-blocking TTS
- structured post-session evaluation
- 5 universal skill scores: Clarity, Assertiveness, Empathy, Structure, Conciseness
- scenario-specific objectives
- transcript-linked coaching
- retry and attempt comparison
- session history
- progress profile
- responsive/error/loading states

Explicitly out of scope:

- languages beyond English and Arabic
- arbitrary custom scenarios beyond the approved CV/JD interview workflow
- new external realtime speech-to-speech infrastructure (preserve/audit existing internal continuous-call mode)
- learner video, animated avatars and lip-sync; static fictional counterpart portraits are approved
- multiplayer/community
- teams/enterprise dashboards
- billing
- courses/gamification
- live meeting analysis
- microservices, Redis, queues, object storage unless later proven necessary

## Approved September 6 redesign

Direction approved, implementation pending. Light-only Warm Coral Concept A, new Kalemny / كلمني logo, no neo-brutalism or blue/purple gradients. Full bilingual experience on mobile/desktop. Practice selection first, all six scenarios directly discoverable, prominent CV/JD custom interview entry, modest recommendation badge. Call workspace with fixed realistic fictional counterpart portraits and visible transcript. Mobile composer and mic occupy separate rows; stop playback stays near speaking status. Results lead with supportive, evidence-linked coaching.

During testing all scenario types are free with three combined simulation starts per rolling seven days, including retries. Retain server-authoritative ledger/authorization/rate limits; remove any paid custom gate/upgrade prompts as needed during implementation. Launch monetization is deferred. Do not claim this policy is shipped without verification. Use REDESIGN_PLAN milestones instead of restarting the already completed original vertical slice.

## Architectural Invariants

1. Browser never calls OpenRouter or any upstream AI provider directly.
2. Browser never supplies the authoritative user identity.
3. Hidden scenario/persona/rubric data never leaves the API.
4. Historical attempts reference immutable scenario versions.
5. Retry creates a new attempt; previous attempts are never overwritten.
6. One learner input maps to one idempotent `ConversationTurn`.
7. AI failure must never delete accepted learner text.
8. Roleplay and evaluation are separate AI responsibilities.
9. Evaluation uses structured output and runtime validation.
10. AI feedback references real stored turn IDs; never trust AI-generated learner quotes.
11. Overall score is deterministic: 70% universal skills + 30% scenario objectives.
12. Progress is deterministic from the latest 5 eligible sessions.
13. Raw microphone audio and TTS audio are not permanently stored.
14. TTS failure must never block the text experience.
15. Transcripts, prompts, audio, tokens, and secrets must never be written to standard logs.
16. Every protected resource must be authorized on the backend.
17. External AI calls require explicit timeouts and safe failure handling.
18. OpenRouter AI operations use one explicitly configured provider; automatic model routing and multi-provider orchestration are prohibited. The existing backend Edge TTS adapter is an explicit separate speech-synthesis boundary.
19. OpenRouter routing must preserve workplace-transcript privacy; prefer Zero Data Retention-compatible routes/providers where available.

## Engineering Rules

- Strict TypeScript; avoid `any` unless unavoidable and documented.
- Validate external inputs and AI outputs with Zod.
- Prefer small modules with clear ownership over giant files.
- Do not add abstractions before they solve a real problem.
- Keep deterministic business logic out of AI prompts.
- Use centralized error handling and stable application error codes.
- Preserve idempotency for expensive/mutating operations.
- Never expose stack traces or secrets to clients.
- Never place secrets in frontend code or `NEXT_PUBLIC_*` variables.
- Use database constraints for important invariants in addition to application validation.
- Do not hold DB transactions open during AI/network calls.
- Include loading, empty, error, retry, permission, and unauthorized states where relevant.
- Maintain accessibility fundamentals and text fallback for all voice features.
- DO NOT WORK WITH TDD

## Testing Expectations During Development

Write tests alongside critical behavior where practical, especially for:

- score calculations
- lifecycle/state transitions
- authorization
- idempotency
- validation
- progress calculations
- evaluation reference validation
- AI failure/fallback behavior

Do not test AI prose with brittle exact-string assertions. Test contracts, schemas, invariants, and failure handling.

## Development Priority

Build vertically, not feature-by-feature across the whole application.

First milestone:

`Auth → Salary Negotiation / Medium → Text Conversation → Finish → Evaluation → Persisted Results`

Only after that works end-to-end add:

`Retry → Progress/History → STT → TTS → Remaining Scenarios → Polish`

Voice must never block completion of the core text loop.

## Agent Completion Rule

Before declaring a task complete:

- run relevant tests/type checks/linting;
- verify the changed behavior against the source-of-truth docs;
- report any unresolved issue or assumption;
- update `docs/PROJECT_STATE.md` when the milestone or project state materially changes.

Protect scope and reliability: prefer a smaller reliable approved implementation over extra features or architectural sophistication. Set a new delivery target after the redesign baseline, not by reusing the historical deadline.
