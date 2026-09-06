# REDESIGN_PLAN.md

## Approved Decisions
- **D01 Brand**: Kalemny / كلمني. Warm Coral Concept A visual direction.
- **D02 Theme**: Light mode only, coral accent (`#F47765`), warm off-white (`#FAF8F5`), white cards, charcoal text. No neo-brutalism or blue/purple gradients.
- **D03 Bilingual**: English and Arabic throughout. Modern Standard Arabic for UI, Egyptian/Gulf dialects for simulation.
- **D04 Navigation**: Sign-in lands directly on practice selection (`/app`). 6 scenarios directly discoverable + custom interview entry.
- **D05 Testing Policy**: Free access to all scenarios during testing with 3 combined simulation starts per rolling 7 days.
- **D06 Call Workspace**: Fictional adult portrait, permanently visible transcript, clear turn status. No learner video.
- **D07 Static Portraits**: Fixed static fictional portraits per curated scenario + default for custom interviews. No animation/lip-sync.
- **D08 Results**: Supportive coaching, strengths/improvements with real turn IDs, stronger wording suggestions, 5 universal skills + objectives.
- **D09 Mobile Simulator**: Compact portrait, full-width composer row, separate dedicated microphone row, stop playback by speaking status.

## Milestone Delivery Sequence

### Phase 1 — Foundation
#### M01 — Design Foundation & Tokens (Completed)
- [x] R01 Audit existing routes, components, tokens, and testing entitlements.
- [x] R02 Finalize Concept A vector logo mark and bilingual lockups.
- [x] R03 Finalize semantic tokens, typography scales, spacing, focus/error states in `WARM_CORAL_DESIGN.md`.
- [x] R04 Design corrected mobile simulator states (360px & 390px, keyboard open/closed, full-width composer, separate mic row).
- [x] R05 Map all primary application screens to Warm Coral layout and reviewed copy.

### Phase 2 — Shared Architecture
#### M02 — Bilingual Shell & Primitives
- [ ] R06 Implement light-only tokens, CSS variables, and semantic primitives (Button, Card, Badge, Dialog).
- [ ] R07 Implement bilingual layout shell, direction handling (LTR/RTL), and locale switching.
- [ ] R08 Update global navigation (header, mobile drawer, practice/history/progress links).

#### M03 — Backend & Testing Entitlements
- [ ] R09 Update entitlement service to enforce 3 free simulation starts per rolling 7 days across curated + custom scenarios.
- [ ] R10 Add explicit feedback language handling to evaluation pipeline.
- [ ] R11 Verify and expose server-authoritative remaining quota in `/me` or entitlement endpoints.
- [ ] R12 Verify localized scenario metadata (Arabic titles/descriptions) across active definitions.

### Phase 3 — Core Simulation Loop
#### M04 — Discovery & Setup
- [ ] R13 Redesign `/app` practice selection: 6 scenario cards, custom interview entry, subtle recommendation badge.
- [ ] R14 Redesign scenario briefing modal/screen (context, objectives, difficulty, language/dialect, mode).
- [ ] R15 Redesign CV/JD custom interview wizard (in-memory PDF upload, JD input, generation review).

#### M05 — Call Simulation Workspace
- [ ] R16 Integrate static fictional counterpart portraits with name/role/voice alignment.
- [ ] R17 Implement continuously visible transcript layout (desktop side-by-side; mobile below portrait).
- [ ] R18 Build mobile controls: dedicated full-width composer row + separate dedicated microphone row.
- [ ] R19 Connect push-to-talk audio capture, Whisper STT, and barge-in / interruption controls.
- [ ] R20 Adapt continuous hands-free call mode (`REALTIME`) to Warm Coral workspace.

### Phase 4 — Evaluation & Coaching
#### M06 — Results & Retry
- [ ] R21 Redesign results screen: summary card, overall score, strengths & improvement areas.
- [ ] R22 Render evidence-linked coaching citing real stored turn IDs and labeled suggestions.
- [ ] R23 Render 5 universal skill scores (0–100) and scenario objective badges.
- [ ] R24 Implement retry flow (creates new attempt of same scenario/difficulty) and attempt comparison view.

#### M07 — History & Progress
- [ ] R25 Redesign `/app/history`: attempt list, score badges, retry relationships, owner-only deletion.
- [ ] R26 Redesign `/app/progress`: rolling 5-session averages, weakest skill indicator, practice recommendations.

### Phase 5 — Public Experience & Polish
#### M08 — Landing & Authentication
- [ ] R27 Redesign public landing page with bilingual copy, truthful feature previews, and free testing CTAs.
- [ ] R28 Redesign Clerk auth wrappers and return-url routing.
- [ ] R29 Monorepo-wide visual polish pass: eliminate all legacy neo-brutalist and blue/purple styles.

### Phase 6 — Validation & Release
#### M09 — Release Verification Gate
- [ ] R30 Run complete test suite, typecheck, lint, and production builds.
- [ ] R31 Verify responsive layout across mobile (360px, 390px) and desktop viewports in English & Arabic.
- [ ] R32 Execute authenticated staging smoke test across all routes with live credentials.
