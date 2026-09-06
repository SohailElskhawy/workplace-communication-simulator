# PROJECT_STATE.md

## Project
**Kalemny / كلمني** — AI Workplace Communication Simulator. Deliberate practice for difficult workplace conversations with adaptive AI, structured coaching, retry, and progress tracking. Bilingual: English (`en`) & Arabic (`ar`) (Egyptian & Gulf dialects).

## Status
- **Phase**: Development (Bilingual Warm Coral Redesign)
- **Active Milestone**: M02 — Bilingual Shell & Primitives ([REDESIGN_PLAN.md](REDESIGN_PLAN.md))
- **Completed**: M01 — Design Foundation & Tokens (R01–R05 complete: audits, vector logo mark & bilingual lockups, token spec in WARM_CORAL_DESIGN.md, mobile simulator state budgets, screen mapping & copy inventory)
- **Next Task**: R06–R08 in `REDESIGN_PLAN.md` (implement light-only tokens/CSS vars/primitives, bilingual layout shell & direction handling, update global navigation)
- **Testing Policy**: All scenario types free with 3 combined starts per rolling 7 days.

## Verified Baseline (473 tests passing)
- **Auth**: Clerk JWT validation + lazy local user provisioning.
- **Scenarios**: 6 curated immutable scenarios + owner-scoped custom interview generation from in-memory CV PDF & JD.
- **Simulation**: Push-to-talk (Whisper STT) and continuous hands-free call mode (`REALTIME` with VAD/interruption). Text fallback always available.
- **Speech**: On-demand Edge-TTS neural voices (AR: Salma/Shakir/Zariyah/Hamed, EN: Jenny/Guy).
- **Evaluation**: Independent structured evaluation via OpenRouter; 5 universal skills (0–100) + scenario objectives; deterministic score `round(0.70 * universal + 0.30 * scenario)`.
- **Progress**: Deterministic from latest 5 eligible completed sessions (>=3 turns).
- **Data & Privacy**: Neon PostgreSQL with Prisma. No raw audio or TTS audio stored. Zero transcript logging.

## Governing Docs
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — Requirements & evaluation model
- [ARCHITECTURE.md](ARCHITECTURE.md) — Architecture & invariants
- [DATABASE_DESIGN.md](DATABASE_DESIGN.md) — Persistence schema
- [API_CONTRACT.md](API_CONTRACT.md) — REST contracts
- [AI_DESIGN.md](AI_DESIGN.md) — AI models, prompts & rubrics
- [WARM_CORAL_DESIGN.md](WARM_CORAL_DESIGN.md) — Design specification
- [REDESIGN_PLAN.md](REDESIGN_PLAN.md) & [REDESIGN_TECHNICAL_DECISIONS.md](REDESIGN_TECHNICAL_DECISIONS.md) — Implementation milestones
