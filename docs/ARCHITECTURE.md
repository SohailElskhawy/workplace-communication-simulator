# ARCHITECTURE.md

## 1. System Topology
```text
Browser (Learner)
  │
  ├── Clerk (Auth Session & JWT)
  │
  ▼ HTTPS + Bearer Token
Next.js Web (Vercel)
  │
  ▼ HTTPS REST /api/v1
Express API (Railway)
  ├── PostgreSQL (Neon via Prisma ORM)
  ├── Backend Services (Auth, Scenarios, Attempts, Entitlements, History, Progress)
  ├── AiService → OpenRouterProvider (Roleplay, Evaluation, STT)
  └── TtsService → EdgeTtsProvider (msedge-tts speech synthesis)
```
No Redis, queues, WebSockets, microservices, or external realtime telephony providers in Release 1.

## 2. Monorepo & Module Boundaries
- `apps/web`: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query.
  - Owns UI, client state, audio capture (MediaRecorder, Web Audio VAD), TTS playback.
  - Never calls AI directly, never handles secrets, never calculates authoritative scores.
- `apps/api`: Express.js, TypeScript, Zod.
  - Owns auth verification, authorization, attempts lifecycle, turn exchanges, AI orchestration, evaluation, scoring, progress, entitlements.
  - Modules: `auth`, `users`, `scenarios`, `attempts`, `voice`, `tts`, `evaluations`, `history`, `progress`, `entitlements`, `ai`.
- `packages/contracts`: Shared TypeScript schemas and Zod validators (DTOs, error codes, enum types).
- `prisma`: Database schema, migrations, seed scripts.

## 3. Core Technical Flows
### Simulation Turn Exchange
`Learner Input (Text/Voice) → API /attempts/:id/turns → Persist Turn (Pending) → OpenRouter Roleplay → Persist Assistant Reply → Return Turn`
- One learner input maps to exactly one idempotent `ConversationTurn`.
- Accepted learner text survives AI roleplay failures.

### Voice Capture (PTT & Continuous Call)
- **Push-to-Talk**: `MediaRecorder` buffers in-memory audio (max 120s) → `POST /transcriptions` → in-memory Whisper STT → returns text to composer. Raw audio is never stored on disk or DB.
- **Continuous Hands-Free Call**: Client-side Web Audio level meter & silence detector (1.8s window) auto-segments utterances, sends to transcription, exchanges turns, and plays Edge-TTS audio with client-side interruption / barge-in.
- **Text-to-Speech**: `GET /turns/:turnId/tts` streams synthesized MP3 from backend `msedge-tts` adapter. Audio discarded after playback.

### Evaluation Pipeline
`Attempt Finished → Atomic DB Claim → OpenRouter Evaluation → Zod Validation (Real Turn IDs) → Deterministic Scoring (70/30) → Persist Evaluation`
- Evaluator treats learner transcript as untrusted evidence, not instructions.
- Roleplay and evaluation are separate AI calls and prompts.

## 4. Architectural Invariants
1. **No Direct Browser AI**: All AI provider calls originate from the Express backend.
2. **Server-Authoritative Identity**: Authenticated identity is verified via Clerk JWT; client-supplied user IDs are rejected.
3. **Information Boundary**: Hidden personas, objectives, and evaluation rubrics never cross the API boundary.
4. **Immutable History**: Historical attempts and scenario versions are immutable; retries create new attempts.
5. **Idempotent Turns**: Turn submission and evaluation requests are idempotent.
6. **Zero Audio Persistence**: Raw microphone recordings and synthesized TTS audio are never permanently stored.
7. **Zero Transcript Logging**: Transcripts, prompts, audio buffers, auth tokens, and secrets are excluded from logs.
8. **Deterministic Scoring**: Overall score = `round(0.70 * universal + 0.30 * scenario)`. Never AI-generated.
9. **Deterministic Progress**: Derived from latest 5 eligible completed sessions (min 3 substantive turns).
10. **Backend Ownership Enforcement**: Every protected resource verifies authenticated user ownership.
11. **Timeout & Failure Safety**: All AI operations have strict abort timeouts and safe fallbacks (text fallback always available).
