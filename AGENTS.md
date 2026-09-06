# AGENTS.md

## Project & Core Loop
**AI Workplace Communication Simulator (Kalemny / كلمني)**
`Scenario → Simulation → Evaluation → Coaching → Retry → Improvement`
Users: students & early-career professionals. Bilingual: English (`en`) and Arabic (`ar`) (MSA UI, Egyptian & Gulf dialects).
SDLC Phase: Development — Focus: Warm Coral Concept A bilingual redesign.

## Source of Truth
Read `docs/PROJECT_STATE.md` first for current phase and next task.
- `docs/PROJECT_STATE.md` — Status & verified baseline
- `docs/PRODUCT_REQUIREMENTS.md` — Behavior & acceptance criteria
- `docs/ARCHITECTURE.md` — System structure & invariants
- `docs/DATABASE_DESIGN.md` — Schema & constraints
- `docs/API_CONTRACT.md` — REST endpoints & lifecycle
- `docs/AI_DESIGN.md` — Prompts, rubrics, models, safeguards
- `docs/WARM_CORAL_DESIGN.md` — UI/UX specification
- `docs/REDESIGN_PLAN.md` & `docs/REDESIGN_TECHNICAL_DECISIONS.md` — Redesign milestones

## Token Efficiency
- Focus strictly on active task/milestone. No unrequested refactors or doc rewrites.
- Use targeted `rg` with small line ranges. Never dump whole repos or large files.
- Reuse context. Do not repeat completed research.
- Do not spawn subagents unless authorized.
- Concise responses: changes, files, verification, blockers.

## Stack
- Monorepo: pnpm workspaces (`apps/web`, `apps/api`, `packages/contracts`, `prisma`)
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- Backend: Node.js, Express.js, TypeScript, Zod, REST
- Auth: Clerk (JWT verification, lazy local provisioning)
- Database: PostgreSQL (Neon) with Prisma ORM
- AI: OpenRouter (Roleplay: `deepseek/deepseek-v4-flash-0731`, Eval: `openai/gpt-5.6-luna-pro`, STT: `openai/whisper-large-v3-turbo`)
- TTS: Backend Edge-TTS (`msedge-tts`)
- Deploy: Vercel (web), Railway (API), Neon (DB)

## Scope & Redesign Rules
- 6 curated scenarios + custom CV/JD interview generation. Easy/Medium/Hard.
- Push-to-talk (in-memory STT) and continuous hands-free call mode (`REALTIME`).
- Post-session evaluation: 5 universal skills (0–100) + scenario objectives (Achieved, Partially Achieved, Missed).
- Score: `70% universal skill average + 30% scenario objective score`.
- Progress: latest 5 eligible completed sessions (min 3 substantive turns).
- Testing access: all scenarios free with 3 starts per rolling 7 days.
- Static fictional portraits; no camera, video, lip-sync, or animated avatars.

## Invariants
1. Backend handles all AI calls; browser never calls AI providers.
2. Authoritative user identity derived from validated Clerk JWT only.
3. Hidden scenario/persona/rubric details never leave API.
4. Historical attempts reference immutable scenario versions; retries create new attempts.
5. One learner input maps to one idempotent `ConversationTurn`.
6. AI failure never deletes accepted learner text.
7. Roleplay and evaluation are separate AI responsibilities.
8. Evaluation uses structured output, Zod validation, and real stored turn IDs.
9. Deterministic score: 70% universal + 30% objectives.
10. Deterministic progress: latest 5 eligible sessions.
11. Raw audio and TTS audio are never permanently stored.
12. TTS failure never blocks conversation.
13. Never log transcripts, prompts, audio, tokens, or secrets.
14. Backend ownership authorization on all protected endpoints.
15. AI calls require explicit timeouts and safe error handling.
16. OpenRouter routing must preserve transcript privacy (ZDR where available).

## Engineering Rules
- Strict TypeScript (`noAny`). Validate inputs and AI outputs with Zod.
- Centralized errors with stable error codes; never leak stack traces.
- Deterministic logic stays in application code, not AI prompts.
- Preserve idempotency for mutating actions. Accessible UI (44px targets, focus, contrast).
- DO NOT WORK WITH TDD. Write critical tests alongside implementation.
- Before completion: run tests, typecheck, lint; update `docs/PROJECT_STATE.md`.
