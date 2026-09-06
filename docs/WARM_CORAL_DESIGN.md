# WARM_CORAL_DESIGN.md

## 1. Visual Direction & Palette (Concept A)
- **Philosophy**: Light-only deliberate practice application. Warm off-white canvas, crisp white cards, coral accents, charcoal typography, soft shadows. No neo-brutalism, no heavy black borders, no blue/purple gradients.
- **Palette**:
  - Background: `#FAF8F5`
  - Surface: `#FFFFFF`
  - Text Primary: `#292725`
  - Text Muted: `#625B57`
  - Brand Coral: `#F47765`
  - Action / Button: `#B84132` (white text on action)
  - Selected Surface: `#FFF0EB`
  - Border / Divider: `#E5E1DD`
- **Typography**: Native bilingual humanistic sans-serif (16px base, comfortable line height). No letter-spacing on Arabic text.

## 2. Bilingual Experience (EN & AR)
- Complete LTR and RTL coverage across public landing, authentication, setup, simulation, results, history, and progress.
- Friendly Modern Standard Arabic (MSA) for UI copy; conversational Egyptian or Gulf dialect for simulation practice.
- Logical layout properties (`start`/`end`, `ms-*`, `me-*`) with directional icon mirroring where appropriate (never mirror portraits).

## 3. Screen Layouts

### Practice Selection (`/app`)
- All 6 curated scenarios directly visible in an equal-weight grid/list.
- Custom CV/JD interview generation banner near top.
- Scenario recommendation is a subtle badge on an ordinary card, never an intrusive takeover.
- Testing badge: 3 simulation starts per rolling 7 days across all types.

### Simulation Workspace (`/app/simulations/:id`)
- **Desktop**: Compact header (scenario title, timer, finish action), counterpart portrait stage beside visible scrolling transcript, comfortable composer controls below.
- **Mobile Layout**:
  - Compact counterpart portrait leaving ample space for visible transcript.
  - Dedicated full-width composer row with inline send button.
  - Dedicated microphone row below composer (tap to record, Done, Cancel).
  - Stop playback action placed beside speaking status (never squeezed into the input row).
  - Keyboard and safe-area clearance: composer and active transcript stay visible when soft keyboard opens.

### Results & Coaching (`/app/results/:id`)
- Summary card with overall score and supportive tone.
- Strengths and improvements citing real conversation moments.
- Stronger response examples with clear "suggestion" labeling.
- 5 universal skill breakdown (0–100) + scenario objective badges (Achieved / Partial / Missed).
- One focused retry CTA.

## 4. Accessibility & UI Invariants
- Minimum 44px touch targets.
- 4.5:1 text contrast ratio on all readable text.
- Full keyboard navigation and visible focus rings.
- Text fallback always available during voice operations.
