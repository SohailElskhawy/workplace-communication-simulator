# PROJECT_STATE.md

## Project
**Kalemny / كلمني** — AI Workplace Communication Simulator. Deliberate practice for difficult workplace conversations with adaptive AI, structured coaching, retry, and progress tracking. Bilingual: English (`en`) & Arabic (`ar`) (Egyptian & Gulf dialects).

## Status
- **Phase**: Development (Bilingual Warm Coral Redesign)
- **Active Milestone**: M05 — Call Simulation Workspace ([REDESIGN_PLAN.md](REDESIGN_PLAN.md))
- **Completed**:
  - M01 — Design Foundation & Tokens (R01–R05 complete: audits, vector logo mark & bilingual lockups, token spec in WARM_CORAL_DESIGN.md, mobile simulator state budgets, screen mapping & copy inventory)
  - M02 — Bilingual Shell & Primitives (R06–R08 complete: Warm Coral light-only tokens & CSS vars in globals.css, Button/Card/Badge/Dialog primitives, LocaleProvider & dynamic LTR/RTL switching, BrandLogo & responsive bilingual AppHeader navigation)
  - M03 — Backend & Testing Entitlements (R09–R12 complete: entitlement service enforcing 3 free simulation starts per rolling 7-day window across curated + custom scenarios, evaluation prompt feedback language handling for Arabic MSA / English, dedicated `/api/v1/entitlements` route and client integration, localized scenario metadata across all 6 curated definitions and frontend briefing cards)
  - M04 — Discovery & Setup (R13–R15 complete: `/app` Practice Selection Hub with testing entitlement banner and custom interview hero banner, `CuratedScenarioGrid` with static portraits and recommendation badge, in-place `ScenarioBriefingModal` with URL query sync `?scenario=[key]` and Warm Coral difficulty/dialect/mode selectors, legacy route `/app/scenarios/[scenarioKey]` redirect, and `CustomInterviewWizard` Warm Coral redesign)
- **Next Task**: R16–R20 in `REDESIGN_PLAN.md` (M05 — Call Simulation Workspace: static fictional counterpart portraits, continuously visible transcript layout, mobile composer & dedicated mic row, push-to-talk audio capture with Whisper STT, continuous hands-free call mode)
- **Testing Policy**: All scenario types free with 3 combined starts per rolling 7 days.

## Verified Baseline (551 tests passing across 84 test suites)
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
