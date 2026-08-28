# AGENTS.md

## Project

**AI Workplace Communication Simulator** — production-quality MVP due **September 3, 2026**.

Core loop:

`Scenario → Simulation → Evaluation → Coaching → Retry → Improvement`

Primary users: students and early-career professionals practicing difficult workplace conversations.

Release 1 is **English-only**.

## Current SDLC State

- Planning: approved
- Analysis: approved
- Design: approved
- Development: current phase

Do not silently change approved product scope or architecture. If a requested implementation conflicts with the source-of-truth docs, report the conflict before changing behavior.

## Read Before Coding

Read these in order when present:

1. `docs/PROJECT_STATE.md` — current phase, completed work, next task, known issues
2. `docs/PRODUCT_REQUIREMENTS.md` — product behavior and acceptance criteria
3. `docs/ARCHITECTURE.md` — system structure and architectural invariants
4. `docs/DATABASE_DESIGN.md` — persistence model and constraints
5. `docs/API_CONTRACT.md` — REST contracts and lifecycle rules
6. `docs/AI_DESIGN.md` — prompts, evaluation, structured output, AI safeguards

`PROJECT_STATE.md` is the operational source of truth. Update it after completing a meaningful milestone.

## Approved Stack

- Monorepo: pnpm workspaces
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- Backend: Node.js, Express.js, TypeScript, Zod, REST
- Auth: Clerk
- Database: PostgreSQL on Neon
- ORM: Prisma
- AI/STT/TTS: OpenAI behind an internal `AiService`
- Deployment: Vercel (web), Railway (API), Neon (DB)

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

- Arabic or other languages
- custom/user-generated scenarios
- realtime speech-to-speech
- video/avatars
- multiplayer/community
- teams/enterprise dashboards
- billing
- courses/gamification
- live meeting analysis
- microservices, Redis, queues, object storage unless later proven necessary

## Architectural Invariants

1. Browser never calls OpenAI directly.
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

Protect the September 3 deadline: prefer a smaller reliable P0 implementation over extra features or architectural sophistication.
