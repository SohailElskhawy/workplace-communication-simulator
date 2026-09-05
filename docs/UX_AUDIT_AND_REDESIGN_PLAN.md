# Kalemny UI/UX audit and redesign plan

Date: 2026-09-04

## Audit scope

The audit covers the authenticated Next.js application, its public landing/auth surfaces, route structure, global CSS and tokens, reusable UI primitives, scenario discovery and setup, custom interview creation, push-to-talk and realtime simulation, transcript handling, evaluation/results, retry and comparison, history, progress, dialogs, loading/error states, and responsive behavior.

The redesign is presentation- and interaction-layer work. Existing API contracts, attempt lifecycle, AI behavior, scoring, persistence, ownership, privacy, entitlements, and error semantics remain authoritative.

## Current implementation inventory

### Routes

- `/`: public landing and pricing
- `/sign-in`, `/sign-up`: Clerk authentication
- `/app`: authenticated dashboard
- `/app/scenarios`: scenario library
- `/app/scenarios/[scenarioKey]`: scenario briefing and setup
- `/app/scenarios/custom`: dedicated custom interview workflow
- `/app/simulations/[attemptId]`: push-to-talk or realtime practice
- `/app/results/[attemptId]`: evaluation and coaching
- `/app/history`: attempt history and deletion
- `/app/progress`: five-skill progress profile and recommendation

### Existing reusable foundations to retain

- `AppLayoutShell`, `AppHeader`, and `AppContainer` for authenticated layout boundaries.
- `AccessibleDialog` for focus trapping, Escape handling, focus restoration, and modal semantics.
- `Button`, `Badge`, and `GlassCard` as the starting point for semantic primitives, with their visual treatment replaced.
- `DifficultySelector` and `InteractionModeSelector`, preserving their values and selection behavior.
- `ConversationStage`, `SimulationComposer`, `LiveConversation`, `TranscriptDrawer`, and `SimulationHeader`, preserving their ownership boundaries and callback contracts.
- `ResultsHeroCard`, five-skill display, evidence-linked coaching, objectives, comparison, transcript, retry, and delete components.
- Shared API client, contracts, feature flags, voice recorder, speech playback, input-state helpers, score utilities, and realtime transcript normalization.
- Existing loading, empty, error, evaluation-processing, and evaluation-failure states.

### Functional capabilities that must remain

1. Clerk authentication and owner-scoped data access.
2. Six curated scenarios and owner-created personalized interviews.
3. Category filtering, scenario detail, and scenario deletion rules.
4. Easy, Medium, and Hard behavior selection.
5. Push-to-talk, editable transcription, typed fallback, and 120-second recording limit.
6. Realtime voice, transcript capture/import, mute, restart, and clean session ending.
7. Optional TTS with text as the canonical conversation record.
8. Explicit finish, attempt expiry, 20-turn limit, and safe failure recovery.
9. Structured evaluation, deterministic overall score, five skill scores, objectives, evidence-linked moments, stronger responses, and next focus.
10. Retry with interaction-mode preservation and attempt comparison.
11. History, progress, recommendations, deletion, quota/plan enforcement, and all loading/error/empty states.

## Major UX and design problems

### 1. The product hierarchy does not match the three primary user intentions

- The dashboard uses a large, elevated recommended card before exploration and interview preparation, so it predictably captures most attention.
- Browse scenarios appears later as “Practice something else,” which frames exploration as secondary.
- Interview preparation is presented as “Custom Interview,” “Create Custom Interview,” and “AI Role Simulator.” These labels describe configuration or technology instead of the user outcome.
- The custom interview entry is duplicated across the dashboard and scenario library, yet it still lacks a stable top-level place in the information architecture.

### 2. The visual system is intense and internally inconsistent

- The web source contains 227 raw hex color usages, 174 hard-shadow/brutalist utility usages, and 286 uppercase utility usages.
- Heavy outlines, offset shadows, translucent surfaces, dot grids, squiggles, gradients, and colored status treatments compete for attention on most screens.
- Semantic colors are frequently used as decorative fills, reducing their ability to communicate status.
- Design decisions are repeated as screen-local Tailwind strings rather than centralized semantic variants.
- The current 4px baseline and many one-off values conflict with the requested 8px product rhythm.

### 3. Voice turn-taking is not represented as a continuous conversation

- `isConversationInputDisabled` disables input while counterpart speech is loading or playing. This directly prevents push-to-talk interruption.
- Push-to-talk is click-led, has no discoverable keyboard/hold gesture, and is hidden behind a persistent Voice/Text mode switch.
- “AI speaking” only says that audio is playing; it does not explicitly say the learner may interrupt.
- Realtime states distinguish speaking and listening, but the primary controls remain a separate status panel rather than one persistent floor-control model.
- The interface does not clearly separate “ready for you,” “hearing you,” “processing,” “AI speaking but interruptible,” and microphone failure in one consistent component.

### 4. Scenario browsing still privileges a featured card over exploration

- The “All” view removes one scenario from the grid and promotes it into another oversized featured treatment.
- Categories exist, but search is missing and category mappings are partly presentation-owned.
- Difficulty is inferred by a visual map instead of being consistently represented by scenario data.
- The custom interview spotlight, custom filter action, and custom catalog card compete with each other.
- Decorative hero elements take space before users reach the browse controls.

### 5. Results reveal too much at once

- Score hero, comparison, five skills, moments, objectives, strengths, and improvements are all expanded sequentially.
- The action the user most needs—understand the summary, inspect evidence, focus on one improvement, retry—is diluted by equal visual weight across many sections.
- Evidence, analysis, and stronger-response content are visually dense and repeat several nested card treatments.
- “Next focus” is present, but not consistently positioned as the closing coaching decision.

### 6. RTL readiness is currently structural debt

- The root document is fixed to `lang="en"` and loads Latin-only font subsets.
- At least 78 physical left/right utility usages appear in the web UI, including transcript alignment, drawer borders, padding, arrows, and corner shaping.
- Conversation alignment is hard-coded with `items-start/items-end`, `rounded-tl/rounded-tr`, and physical drawer positioning rather than role and inline direction.
- Directional arrows and back controls do not mirror.
- Long Arabic strings have not been accounted for in button labels, navigation, badges, or transcript bubbles.

### 7. Responsive behavior is defensive rather than fully adaptive

- Global `overflow-x: clip` masks overflow instead of proving every component reflows.
- The four-item mobile navigation is squeezed into a narrow second header row.
- Several 32–40px controls fall below the requested 44px target.
- Dense mobile results and simulation controls reduce type and padding aggressively instead of prioritizing content.
- Fixed desktop sidebars and modal/drawer assumptions need logical-direction and container-aware behavior.

### 8. The frontend is harder to refine consistently than necessary

- Major UI files are very large: scenario library 804 lines, simulation page 744, realtime control 589, dashboard 561, and results page 501.
- Repeated button, card, badge, section-heading, search, filter, status, and empty-state class strings drift across screens.
- Existing primitives are underused, so changing the product system requires editing many screen-local style declarations.

## What is working and should remain

- The product loop and routes are complete and coherent.
- The API and frontend already distinguish loading, empty, error, expired, limited, failed-turn, evaluation-processing, and evaluation-failure states.
- The simulation has a dedicated reduced-navigation shell.
- The voice recorder exposes microphone level and an editable transcript before sending.
- Realtime transcript pairing suppresses nonverbal noise and groups same-speaker chunks.
- Evaluation references stored turn IDs rather than trusting generated quotes.
- Dialog keyboard behavior, visible focus, reduced-motion handling, and text fallback are solid accessibility foundations.
- Logical container sizing and many responsive grid breakpoints already exist.

## Proposed product system

### Visual posture

Calm coaching workspace: quiet off-white canvas, clean white surfaces, one Kalemny blue accent used for selection and the primary action, restrained green/amber/red semantics, 1px neutral borders, soft ambient elevation, medium radii, sentence-case labels, generous whitespace, and small geometric “speech pulse” moments used only in practice contexts.

### Typography

- Display: Charter / Iowan Old Style / Georgia for welcoming, human coaching headlines.
- Body: system UI with Noto Sans Arabic and Segoe UI fallbacks for bilingual readiness.
- Mono: JetBrains Mono / system mono only for timers, shortcuts, scores, and compact status metadata.
- Sentence case replaces pervasive uppercase. Labels may use restrained weight or letter spacing without shouting.

### Spacing and shape

- 8px base scale: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80.
- Controls: minimum 44px target.
- Controls: 10–12px radius; cards and dialogs: 16px radius.
- Borders: 1px except high-risk error focus where 2px is justified.
- Elevation: soft ambient shadows only for overlays and selected raised surfaces.

### Core reusable components

- `PageHeader`: eyebrow, title, supporting copy, and one contextual action.
- `PracticePathCard`: equal-weight home entry for Recommended, Browse, and Real Interview.
- `ScenarioCard`: category, title, concise description, difficulty options, and a single action.
- `SearchFilterBar`: search, category, and compact filter controls.
- `SelectionCard`: shared difficulty and interaction-mode behavior.
- `VoiceFloor`: one state model for Ready, Listening, Processing, AI Speaking/Interruptible, and Error.
- `PushToTalkControl`: pointer and Space-key hold behavior, click fallback, shortcut hint, and speech-interruption callback.
- `RoleMessage`: role-based inline-start/inline-end alignment using logical CSS and direction-aware corners.
- `ScoreOverview`: overall score, summary, and next focus.
- `SkillMeter`: compact five-skill presentation.
- `DisclosureSection`: accessible progressive disclosure for evidence, objectives, comparison, and detailed coaching.
- `EvidenceMoment`: stored learner quote, coach explanation, and stronger response in one linked unit.

## Proposed information architecture

### Primary navigation

- Home
- Practice
- Interview prep
- Progress
- Account menu

History becomes a secondary destination within Progress and remains available at its existing URL. Simulation removes global navigation and keeps only context, transcript/briefing access, sound, time, and End Session.

### Home order

1. Welcome and concise orientation.
2. Three equal-weight practice paths in one responsive group:
   - Recommended practice
   - Browse scenarios
   - Prepare for your real interview
3. Continue/recent practice.
4. Compact communication profile and next focus.

### Practice library

1. Search and filters.
2. Consistent scenario grid.
3. Recommended treatment as a small label within the grid, not a separate oversized layout.
4. A visible but non-duplicated interview-prep route beside the library heading.

### Interview prep

`Upload CV → Add job description → Review personalized interview → Choose difficulty/mode → Start`

The existing `/app/scenarios/custom` route and API remain intact. Copy and hierarchy shift from “custom scenario generation” to preparation for a real interview.

### Results

`Overall score + summary → five skills → strengths and improvements → evidence-linked moments → objectives/comparison details → next focus + retry`

Only the first three layers are open initially. Detailed evidence and objective/comparison sections use accessible disclosure.

## Screen-by-screen redesign plan

### Application shell

- Replace heavy selected-nav shadows with quiet filled/outlined states.
- Add a first-class Interview prep destination.
- Use a compact mobile navigation pattern with 44px targets and no squeezed labels.
- Add `dir`-aware utilities and mirror directional icons.

### Homepage

- Put the three primary intentions at the top with equal footprint and distinct value-led copy.
- Keep recommendation personalization but remove its oversized visual dominance.
- Show “Upload CV → Job description → Personalized interview” directly on the interview-prep card.
- Move profile and recent activity below choice architecture.

### Scenario library

- Remove the oversized featured scenario split.
- Add search and keep category filters.
- Standardize cards and metadata.
- Mark recommendation within the grid.
- Replace duplicate custom-interview widgets with one stable Interview prep entry.

### Scenario briefing/setup

- Keep context, roles, objective, difficulty, and interaction-mode selection.
- Sequence information from “what you are practicing” to “how you want to practice.”
- Use calm selection cards with clear selected, hover, focus, and disabled states.

### Interview prep

- Use an explicit three-step progress model.
- Preserve PDF validation, 5MB limit, 50-character job-description rule, privacy copy, generation, review, and plan errors.
- Present the output as a personalized practice plan, not AI configuration.

### Push-to-talk simulation

- Make the center status the single source of truth for who has the floor.
- Keep the microphone visible in every non-terminal state, including AI speech.
- Starting push-to-talk during AI speech cancels playback and begins recording.
- Support hold Space to talk and pointer hold, with click fallback.
- Keep the shortcut hint visible until learned; never hide text fallback.
- Replace state-specific stacked banners with one persistent control area.

### Realtime simulation

- Use the same VoiceFloor state language as push-to-talk.
- Clearly state “AI speaking — interrupt any time,” “Listening — I can hear you,” “Processing,” and “Ready — your turn.”
- Keep mute/end controls secondary to the floor state.
- Use subtle live level bars/rings without continuous decorative animation under reduced motion.

### Results

- Lead with score, summary, next focus, and Retry.
- Show five skills in a compact scannable row/grid.
- Pair strengths and improvements.
- Collapse evidence-rich moments, objectives, comparison, and transcript access behind meaningful disclosure labels.
- Keep all stored evidence and deletion/retry functions.

### Progress and history

- Treat Progress as the main learning record and History as its session log.
- Keep deterministic calculations and filtering unchanged.
- Reduce vanity-style metric cards and emphasize next practice decision.

## RTL architecture requirements

- Use `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, and logical text alignment for new shared styles.
- Represent message ownership as `data-role="learner|counterpart"`; CSS maps roles to inline start/end.
- Add a `.directional-icon` transform under `[dir="rtl"]`.
- Avoid fixed `left`, `right`, `rounded-tl`, and `rounded-tr` in shared components.
- Include Arabic-capable font fallbacks and allow wrapping in navigation, controls, badges, and cards.
- Keep icon and status order meaningful when mirrored.
- Locale routing is not introduced in this UI pass; the document and component architecture are prepared for a future locale segment without changing business flows.

## Functional parity gate

The redesign is not complete until each row remains true:

| Capability | Existing owner | UI change allowed | Behavior change allowed |
| --- | --- | --- | --- |
| Authentication | Clerk + route shell | Visual only | No |
| Scenario fetching/detail | API client + contracts | Layout/copy | No |
| Difficulty | Attempt creation | Selection presentation | No |
| Interaction mode | Attempt creation | Selection presentation | No |
| Custom interview | Existing wizard/API | Reframe and restructure | No API/schema change |
| Push-to-talk | Voice recorder + transcription API | Shortcut and interruption affordance | Only cancel active TTS before recording |
| Realtime | ElevenLabs wrapper + realtime API | State/control presentation | No provider/API change |
| Transcript | Stored turns/live pairing | Role-based layout | No content mutation |
| Finish/evaluate | Attempt/evaluation API | CTA and status presentation | No lifecycle change |
| Results | Evaluation contracts | Progressive disclosure | No score/content change |
| Retry/comparison | Existing attempt APIs | Hierarchy | No |
| History/progress/delete | Existing APIs | Hierarchy and cards | No |
| Quotas/plans | Server entitlements | Error/usage presentation | No |

## Incremental implementation order

1. Replace global tokens, primitives, focus/hover states, and direction-aware utilities.
2. Update the authenticated shell and navigation.
3. Rebuild homepage choice architecture.
4. Simplify scenario library and interview-prep entry.
5. Restyle scenario setup and the custom interview wizard.
6. Introduce the shared voice-floor model and interruptible push-to-talk.
7. Apply progressive disclosure to results.
8. Align progress/history and all supporting states.
9. Run lint, type checks, focused tests, production build, and responsive/RTL checks.
