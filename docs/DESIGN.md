---
name: Calm Coaching
colors:
  background: "oklch(98.41% 0.0035 39.48)"
  surface: "oklch(100% 0 0)"
  foreground: "oklch(22.32% 0.0016 17.27)"
  muted-foreground: "oklch(39.77% 0.0272 276.75)"
  border: "oklch(82.81% 0.0279 281.22)"
  primary: "oklch(52.82% 0.2628 262.87)"
typography:
  display:
    fontFamily: Charter, Iowan Old Style, Georgia, Noto Naskh Arabic, serif
    fontWeight: "600"
    lineHeight: "1.1"
  body:
    fontFamily: Noto Sans Arabic, Inter, Segoe UI, system-ui, sans-serif
    fontWeight: "400"
    lineHeight: "1.55"
  metadata:
    fontFamily: JetBrains Mono, SFMono-Regular, Consolas, monospace
    fontWeight: "500"
    lineHeight: "1.3"
rounded:
  control: 0.625rem
  card: 1rem
  full: 9999px
spacing:
  unit: 8px
  gutter-mobile: 16px
  gutter-tablet: 24px
  gutter-desktop: 32px
  container-max: 1280px
---

# Kalemny Calm Coaching system

Kalemny is a focused practice environment, not a chatbot or analytics suite. The system should reduce performance anxiety, make the next action obvious, and continuously explain who has the conversational floor.

## Product principles

1. Practice before configuration. Lead with the conversation the learner wants to handle, not AI technology or setup complexity.
2. Calm is functional. Use whitespace, hierarchy, and concise state language to reduce uncertainty during voice practice.
3. One source of truth for the floor. Ready, Listening, Processing, AI Speaking/Interruptible, and Microphone Error share one visual/state component.
4. Coaching unfolds progressively. Show the result and next decision first; reveal evidence and detailed evaluation on demand.
5. Direction is a component concern. New layout, navigation, message, and icon primitives must work in LTR and RTL.

## Core palette

```css
:root {
  --background: oklch(98.41% 0.0035 39.48);
  --surface-solid: oklch(100% 0 0);
  --foreground: oklch(22.32% 0.0016 17.27);
  --muted-foreground: oklch(39.77% 0.0272 276.75);
  --border: oklch(82.81% 0.0279 281.22);
  --primary: oklch(52.82% 0.2628 262.87);
}
```

Derived surfaces and muted fills use `color-mix(in oklch, …)`. Do not add screen-specific raw colors. Semantic success, warning, alert, destructive, and analysis colors are restrained and reserved for actual state. The primary accent is used for the current selection, active conversation state, and one primary action—not decorative card color.

## Typography

- Display: Charter / Iowan Old Style / Georgia with Noto Naskh Arabic fallback. Use for page titles, coaching summaries, and major scores at weight 600.
- Body: Noto Sans Arabic / Inter / Segoe UI / system UI for controls, transcripts, and descriptions.
- Metadata: JetBrains Mono or system mono only for timers, scores, keyboard shortcuts, and compact status metadata.
- Use sentence case. Avoid pervasive uppercase labels.

## Spacing, sizing, and elevation

- Use an 8px rhythm with 4px and 12px only for tight internal adjustments.
- All interactive targets are at least 44px.
- Controls use a 10px radius; cards and dialogs use 16px.
- Cards use opaque white, a neutral 1px border, and optional soft ambient elevation.
- Overlays use a stronger soft shadow and backdrop dimming.
- Never use hard offset shadows, thick black outlines, repeating background patterns, or transform-based button displacement.

## Navigation and choice architecture

Primary destinations are Home, Practice, Interview prep, and Progress. History remains available from Home and Progress. Simulation removes global navigation and retains only context, transcript/briefing access, audio, time, and End Session.

The home screen presents three equal-weight paths:

1. Recommended practice
2. Browse scenarios
3. Prepare for your real interview

Recommendation may use a compact label but must not be larger, brighter, or more elevated than the other paths. Interview prep explains `CV → Job description → Personalized interview`.

## Scenario components

Scenario cards use one consistent anatomy: category, optional recommendation label, title, concise description, difficulty and skill tags, one setup action, and an owner-only delete control for personalized interviews. Search and categories precede the grid. Recommended content remains inside the grid.

## Voice floor

| State | Primary label | Required explanation |
| --- | --- | --- |
| Ready | Your turn | Respond when ready; mic and text are available. |
| Listening | Listening | Kalemny can hear the learner. |
| Processing | Processing | The counterpart is preparing a response. |
| AI speaking | AI speaking — you can interrupt | Tap the mic, hold Space, or start talking in realtime. |
| Mic error | Microphone unavailable | Check permission or continue with text. |

Push-to-talk remains available during TTS playback. Starting it stops counterpart audio before recording. Hold Space is available whenever focus is not inside an editable control, and click-to-record remains supported.

The single speech-pulse/orb is Kalemny’s one expressive flourish. Animation responds to voice level and respects reduced-motion preferences.

## Conversation layout and RTL

Messages use semantic ownership:

```html
<div class="role-message" data-role="counterpart">…</div>
<div class="role-message" data-role="learner">…</div>
```

CSS maps roles to inline start/end. Do not encode ownership with physical left/right utilities. Use logical padding, margin, inset, border, and corner properties. Directional icons carry `.directional-icon` and mirror under `[dir="rtl"]`.

Controls and cards must survive longer Arabic strings through wrapping and flexible sizing. Navigation labels may not use `white-space: nowrap` when it would cause overflow.

## Results hierarchy

1. Overall score, summary, next focus, and Retry.
2. Five communication skills.
3. Strengths and improvements.
4. Collapsed evidence-linked moments.
5. Collapsed scenario objectives.
6. Collapsed retry comparison when present.
7. Transcript access and deletion as secondary utilities.

Only one primary-styled Retry control appears in the initial viewport. Other retry entry points are secondary.

## Interaction states

- Hover changes background, border, or elevation while preserving contrast.
- Focus uses a visible accent ring with surface separation.
- Selected uses accent border/fill and `aria-pressed` or `aria-current`.
- Active moves by at most 1px.
- Disabled is the only state that may reduce contrast.
- Errors pair semantic color with text and `role="alert"`; color alone is insufficient.

## Accessibility and responsive gate

- Maintain visible focus, reduced-motion support, focus-trapped dialogs, text fallback, and semantic live regions.
- Verify no horizontal scroll at 360, 390, 430, 600, 768, 820, 1024, 1366, 1440, and 1920px.
- Do not rely on `overflow-x: clip` as proof that a component reflows correctly.
- Ensure body text meets 4.5:1 contrast and icons/large text meet 3:1.
- Preserve complete transcript text; never hide overflow to solve layout problems.
