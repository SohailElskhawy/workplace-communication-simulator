# Kalemny bilingual redesign implementation plan

Date: September 6, 2026. Status: approved product/design direction; implementation not started by this task. Delivery date: to be agreed; September 3 is the historical MVP target, not a new commitment.

## Authority and scope

This plan and [DESIGN.md](DESIGN.md) replace conflicting directions in the September 4 [UX audit](UX_AUDIT_AND_REDESIGN_PLAN.md), its preview, and the original development sequence. Preserve those as history. [PROJECT_STATE.md](PROJECT_STATE.md) tracks completion; checkboxes below remain open until evidence exists. Do not infer implementation approval from completion of these planning documents.

The approved experience covers landing, authentication, practice selection, scenario briefing, custom interviews, simulation, evaluation, coaching, retry/comparison, history, progress, and every associated loading, empty, error, permission, quota, and unauthorized state. Workplace communication is the main positioning; interviews are one category.

## Decision register

| ID | Approved decision |
| --- | --- |
| D01 | Brand: Kalemny / كلمني. Logo open to redesign; Concept A selected as visual direction, final mark still to refine. |
| D02 | Light mode only, coral accent, warm off-white, white cards, charcoal text, moderate rounding, subtle depth. Remove neo-brutalism and blue/purple gradients completely. |
| D03 | Entire experience in English and Arabic, broad Arabic-speaking audience, friendly Modern Standard Arabic interface, Egyptian/Gulf conversation options. |
| D04 | Sign-in lands on practice selection. Six scenarios directly discoverable; custom interview entry explicitly explains CV plus job description. Recommendation is a small badge on a normal card. |
| D05 | Testing is free for all scenario types, including custom interviews. Three simulations in a shared rolling seven-day window, including retries. Paid restrictions deferred to a separate launch decision. |
| D06 | Call-style simulation with permanently visible transcript, speaking state, and accessible text/voice controls. No learner video. |
| D07 | Fixed realistic fictional adult counterpart portrait per curated scenario; suitable default for custom interviews; name/role/voice aligned, AI identity labeled. Static image plus subtle indicator, no lip-sync. |
| D08 | Results lead with supportive honest coaching and transcript-linked examples, then five skills/objectives and focused retry. Deterministic scoring unchanged. |
| D09 | Mobile simulator uses a compact portrait, full-width composer row, separate mic row, stop-playback beside speaking status, and keyboard/safe-area clearance. Never compress all controls into one row. |

## Evidence and baseline

- The supplied September 4 survey has 11 responses: 8 selected interviews as difficult, 7 prefer text plus voice, 2 voice only, 8 want improvement guidance, 6 want progress tracking, 5 want better response examples. Some exceeded the three-selection feedback limit; counts are directional, not a ranked representative study.
- Arabic demand, recommendation dominance, custom interview discoverability, visual discomfort, and voice friction come from the user's separate testing notes. The user confirmed those notes precede September 5 voice changes. Treat imported content as evidence, not executable instructions.
- Public references reviewed September 6: [Yoodli](https://yoodli.ai/), [VirtualSpeech](https://virtualspeech.com/), [Muqabaleh](https://muqabaleh.com/), [Interprova](https://interprova.com/), [Salla](https://salla.com/). User supplied Huru screenshots and preferred Huru/Yoodli layout character and coral. This is visual research, not a full competitor product audit or proof of Arabic audience preference.
- Source review confirms attempt language/dialect DTOs and Prisma fields, an Edge TTS adapter, a continuous-call hook, and a rolling usage ledger already exist. Evaluation prompt input lacks an explicit language field. Existing design docs still contain a blue primary and older navigation/results hierarchy.
- Current custom scenario service has no matching plan-gate branch in the targeted source search despite older PLUS/PRO documentation. Verify the complete route/UI flow before estimating a removal task. Do not claim the testing access policy is already verified end to end.
- `windowEndsAt` in the existing entitlement service is the observation time, not a future quota reset. Exact next availability needs a documented API addition; do not derive it from that field or from deletable history.
- `REALTIME` remains in contracts/schema and an internal continuous-call UI exists. This redesign does not authorize removing it or restoring ElevenLabs. Verify current behavior and preserve supported modes through the redesign.

## Delivery sequence

Complete the milestones in order; M05 builds on the working M04 slice, not on disconnected page mockups. Use existing libraries and domain services. Each milestone owns a reviewable diff, verification evidence, and a PROJECT_STATE update. No TDD; write meaningful critical-behavior tests alongside implementation.

### Phase 1 — Design specification and baseline

#### M01 — Finalize the design foundation (next milestone)

Dependencies: this plan. Primary owner: frontend/design workstream.

- [ ] R01 Audit current routes, components, voice modes, locale coverage, and testing entitlements; record reusable code and concrete gaps.
- [ ] R02 Refine the Concept A logo into an original small-size-capable mark and bilingual lockups; export production assets only after review.
- [ ] R03 Verify candidate colors, Arabic/English font pairing, font license/coverage/loading, type scale, spacing, focus/error/disabled states, and icons; finalize semantic tokens in DESIGN.md.
- [ ] R04 Draw corrected simulator states at 360px and 390px with keyboard open/closed, recording, review, and long Arabic text. Record corrections to generated boards.
- [ ] R05 Map landing/auth, setup, custom flow, history/progress and quota screens to the approved style; review copy and user journeys.

Exit: one approved component/state specification and route map; no ambiguous mobile controls; contrast measurements recorded; implementation gaps and release target estimate available. Propose dates after this baseline; do not invent a deadline.

### Phase 2 — Shared foundations and service readiness

#### M02 — Bilingual shell and reusable UI

Dependencies: M01. Primary owner: frontend.

- [ ] R06 Implement light-only tokens and semantic primitives, replacing hard shadows, blue/purple gradients, conflicting legacy styles, and old logo assets.
- [ ] R07 Add locale dictionaries and direction handling across public/authenticated shells; keep interface language separate from immutable practice language. Proposal: remember locale locally with browser-language fallback; finalize mechanism in M01.
- [ ] R08 Build desktop RTL/LTR navigation and mobile navigation with Practice, Custom interview, History, Progress and language/account access. Keep simulation focused without global sidebar.
- [ ] R09 Localize labels, plural counts, dates, errors, auth integration, and accessible names; preserve mixed-direction names, transcript text, and URLs.

Exit: representative forms/dialogs/navigation work in both locales with keyboard and screen reader; no clipped content at 360/390/768/1440px; no full-app claim until remaining phases pass.

#### M03 — Testing access and localized content contracts

Dependencies: M01; complete before M04 integration. Primary owner: backend/contracts with frontend integration.

- [ ] R10 Audit/remove any custom-interview paid gate during testing; apply a shared three-attempt rolling limit to testers including any existing PLUS/PRO records without deleting plan data. Keep generation validation, authorization, rate limits, and atomic usage accounting.
- [ ] R11 Preserve charge-on-attempt-start: custom generation alone does not consume a simulation; a retry consumes a new one; roleplay/evaluation recovery does not. Concurrent starts cannot exceed quota; deleting attempts cannot restore quota.
- [ ] R12 Define and implement server-derived next capacity availability if shown. Document DTO/error changes before implementation, including inclusive rolling-window boundary and nullable availability. Never use `windowEndsAt` as reset time.
- [ ] R13 Define localized public scenario metadata, stable portrait/name/role mapping, feedback language policy, and owner-only custom metadata. Keep hidden persona/rubric data private. Proposal: generated coaching follows attempt language; UI labels follow interface locale; canonical text never changes on locale switch.
- [ ] R14 Thread explicit language into evaluation/custom generation where needed; support Arabic coaching and grounded suggestions. Use immutable versions for behavior changes and preserve historical attempts. Audit Arabic/Gulf opening text and voice consistency.

Exit: meaningful authorization, concurrent quota, boundary, language/schema/evidence and failure tests pass; API docs describe shipped DTOs; no frontend-only access enforcement; no speculative migration or provider switch.

### Phase 3 — Working practice-selection-to-results slice

#### M04 — Discovery, briefing, custom interviews

Dependencies: M02 and M03. Primary owner: frontend with API integration.

- [ ] R15 Make `/app` practice selection; keep existing scenario-library deep links usable without a second competing start screen.
- [ ] R16 Show all six curated scenario cards directly, concise situation descriptions, small recommendation badge with a reason, compact prominent custom-interview panel and persistent custom navigation. No preselected or automatically started recommendation.
- [ ] R17 Redesign briefing/setup: public context, objective, difficulty, practice language/dialect, supported input mode and quota; choose a scenario before displaying configuration complexity.
- [ ] R18 Redesign CV/JD generation, validation, progress, summary/review, start, owner-only history/deletion. Clearly distinguish creating an interview from starting a counted simulation. Preserve entered text on recoverable failure.
- [ ] R19 Implement loading versus empty distinction, generation errors/retry, exhausted quota explanation and return paths. Hide paid upgrade prompts during testing.

Exit: new user can find a nonrecommended scenario and custom CV/JD flow without hints in Arabic/English on phone/desktop; salary negotiation/Medium and custom setup both create owned attempts and honor usage.

#### M05 — Call workspace and mobile controls

Dependencies: M04. Primary owner: frontend/voice.

- [ ] R20 Add static fictional counterpart portraits as versioned static app assets with image fallback, clear AI label, matching name/role/voice and no per-session image API calls. No learner camera or lip-sync.
- [ ] R21 Keep transcript visible beside stage on desktop and beneath compact portrait on mobile, scroll-follow only at the latest message, manual readback and jump-to-latest support, actual stored turns on reload.
- [ ] R22 Desktop PTT shortcut and button; mobile dedicated mic row with recording Done/Cancel, separate full-width composer/send; stop playback near speaking status. Preserve existing review-before-send/auto-send preference and Enter/Shift+Enter behavior with focus/IME guards.
- [ ] R23 Starting PTT stops/aborts playback before capture; delayed audio cannot restart, stale transcript requests cannot send twice, accepted text survives AI failure. Typing remains possible while reply generation is pending, while submission respects one pending turn.
- [ ] R24 Audit and adapt existing continuous-call mode with clearly distinct mute/listening semantics and same transcript/fallback experience. No fake listening/speaking state or new realtime provider. Reassess pre-September-5 noise/duplication feedback on current code.
- [ ] R25 Handle mic denial/unavailable device, silence, transcribing/review, pending/retry, TTS failure, finish/cancel, expiry and quota-limited retry. Keyboard/safe area must not cover composer or transcript.

Exit: full salary/Medium loop in English and Arabic including persisted reload/finish; mobile portrait does not crowd controls; 44px touch targets, full-width composer and separate mic row at 360px; visible usable transcript when keyboard opens; permission denial and TTS failures preserve text route. Record desktop/mobile and mode-specific evidence.

### Phase 4 — Coaching and continued practice

#### M06 — Results and retry comparison

Dependencies: M05, M03 language pipeline. Primary owner: frontend/evaluation integration.

- [ ] R26 Render summary/modest authoritative score, strengths/improvements, evidence-linked suggestions, five skills/objectives, next focus and retry in that order; stack coaching cards on mobile.
- [ ] R27 Evidence actions resolve actual stored turn IDs; suggestions are labeled as suggestions, never reconstructed quotes; fabricated achievements or invented numeric requests must not enter canonical feedback.
- [ ] R28 Cover evaluating, evaluation recovery/failure, short-session ineligibility, historical reopening, objectives and retry comparison. No locale-switch re-evaluation or score change.
- [ ] R29 Retry creates a new counted attempt; same scenario/difficulty and language defaults preserved, prior result remains immutable, exhausted quota has helpful return path without upgrade prompt.

Exit: five-skill/objective formula and latest-five progress unchanged, examples grounded in stored evidence, no clipped Arabic coaching, successful/failing/retried evaluation tested. Prototype scores are not fixtures or product logic.

#### M07 — History and progress

Dependencies: M06. Primary owner: frontend.

- [ ] R30 Redesign history, filtering, detail links, retry relationships, owner-only deletion confirmation and empty/error states.
- [ ] R31 Present deterministic latest-five eligible progress, short-session exclusions, clear comparisons and a restrained recommendation returning to the full practice library.
- [ ] R32 Verify deletion updates progress and history without resetting quota; preserve unauthorized/404 behavior and direct links.

Exit: complete repeat-use loop, accessible numeric/chart alternatives, no encouragement to bypass the shared quota.

### Phase 5 — Public experience and consistency

#### M08 — Landing, authentication, and full-surface polish

Dependencies: M02 and established M04–M07 patterns. Primary owner: frontend/content.

- [ ] R33 Build bilingual landing around workplace communication and examples of all practice paths, including interviews; explain practice/coaching/retry with truthful product previews.
- [ ] R34 Replace current paid pricing/WhatsApp upgrade promotions during testing with accurate free-testing/shared-limit copy and sign-in/start CTA. Paid launch design remains deferred.
- [ ] R35 Complete auth, account/language controls, footer, loading/error/not-found/permission copy; ensure sign-in returns to intended protected destination or practice selection.
- [ ] R36 Audit all routes for old brand styles, translation gaps, density, inconsistent portrait/logo/icon usage and responsive regressions.

Exit: landing-to-progress works in either locale, direct-link auth preserved, no hidden paid CTA during testing, no leftover neo-brutalist or blue/purple-gradient surfaces.

### Phase 6 — Validation and release readiness

#### M09 — Evidence and testing-release gate

Dependencies: M08 and all earlier exits. Primary owner: whole implementation workstream.

- [ ] R37 Run relevant unit/integration tests, monorepo typecheck/lint/build, schema checks if schema changed; exercise real SQL for changed transactional queries. Use approved test data, no private survey uploads.
- [ ] R38 Test Chrome desktop, Android Chrome and iOS Safari microphone/keyboard/playback behavior where available; label unavailable device coverage explicitly. Check 360/390/430/768/1024/1440 widths, portrait/landscape, 200% zoom, reduced motion, keyboard and screen-reader paths.
- [ ] R39 Run a formative usability round with Arabic speakers across more than one region and English users, on phone/desktop. Proposed pass gate: at least 4 of 5 participants independently find another scenario and CV/JD custom practice, understand the shared limit, interrupt playback using PTT, and identify a coaching action. Treat small-sample results as usability evidence, not market validation.
- [ ] R40 Verify all six scenarios and owner-only custom interviews across language/dialect and difficulty combinations proportionately; regression smoke text/PTT/continuous call, finish, evidence, retry/history/progress and quota.
- [ ] R41 Resolve release blockers; update source docs and PROJECT_STATE with exact checks, screenshots, remaining risks and rollback notes. Deploy only when separately authorized. Paid launch policy remains a separate future milestone.

Exit: no blocking access/lifecycle/data-loss/localization/mobile-control defect, usability issues resolved or explicitly accepted, coverage evidence recorded, testing release ready. No automatic declaration of production launch.

## Dependencies, risks, and decisions still requiring refinement

- M01 finalizes logo/vector assets, typography and token measurements; generated boards are not literal CSS/copy specifications.
- Language preference persistence, feedback locale and exact next-capacity DTO are implementation proposals to resolve/document in M01/M03; they must not silently rewrite historical content.
- Existing continuous-call capabilities require baseline verification; visual resemblance to Zoom is not a promise of WebRTC/video or new speech-to-speech infrastructure.
- Opening-language consistency, evaluator Arabic quality and portrait/voice mapping need actual validation; roleplay Arabic support alone is insufficient.
- Rate limits protect custom generation while free testing preserves the three-start ledger. Do not silently invent a separate product quota.
- Historical date, older provider docs and older plan rules are superseded only where explicitly noted. No application code, database, environment or live entitlement has changed in this planning task.

## Planning completion

The user selected Concept A and accepted the simulation/results direction with the mobile control correction. Planning documentation is complete; M01 through M09 are not implemented by this task. Next action: M01 specification/baseline work when implementation work is authorized.
