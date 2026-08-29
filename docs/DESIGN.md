---
name: Kinetic Logic
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#434656'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#536600'
  on-secondary: '#ffffff'
  secondary-container: '#c7ef00'
  on-secondary-container: '#576a00'
  tertiary: '#971e26'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8373b'
  on-tertiary-container: '#ffdddb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#caf300'
  secondary-fixed-dim: '#b0d500'
  on-secondary-fixed: '#171e00'
  on-secondary-fixed-variant: '#3e4c00'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410006'
  on-tertiary-fixed-variant: '#8c1520'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  container-max: 1280px
  offset-shadow: 6px
---

## Brand & Style

The design system is a high-fidelity training environment that balances the transparency of modern software with the structural authority of print editorial. It targets high-stakes workplace training, requiring an interface that feels both cutting-edge and dependable.

The aesthetic identity is defined by three intersecting layers:
1.  **Glassmorphism (Structural):** Translucent white surfaces with heavy backdrop blurs (20px+) provide a sense of depth and focus without cluttering the visual field.
2.  **Refined Neo-Brutalism (Functional):** Thin, precise 1px borders in near-black define interactive zones, paired with hard-edged offset shadows that provide immediate tactile feedback.
3.  **Restrained Memphis (Decorative):** Strategic use of geometric patterns—specifically dot grids and subtle squiggles—acts as "visual noise" to delineate different simulation modules and metadata zones.

The emotional response should be one of "Alert Professionalism"—bright, high-contrast, and energetic, moving away from dark-mode "AI" tropes toward an open, sunlight-filled workspace.

## Colors

The palette is anchored by a warm, paper-like background that reduces eye strain during long simulation sessions. 

-   **Primary (Electric Blue):** Reserved for primary actions, progress indicators, and "active" simulation states.
-   **Supporting Accents:** Used for categorization. Lime (#D4FF00) represents "Positive/Success," Coral (#FF6B6B) represents "Conflict/Alert," and Soft Lavender (#E0B0FF) identifies "Metadata/Analysis."
-   **Surface Strategy:** All cards and modals use a translucent white (#FFFFFFCC) with a `backdrop-filter: blur(24px)`. This creates a layered "glass-on-paper" effect.
-   **Borders:** A consistent #1A1A1A border at 1px width is applied to all interactive elements to ground the glass effects.

## Typography

Typography distinguishes between "System Information" and "Communication Content."

-   **Headlines (Space Grotesk):** Bold, geometric, and authoritative. Used for module titles and high-level scoring.
-   **Body (Inter):** High-legibility sans-serif used for the bulk of the simulator's text, dialogue options, and instructions.
-   **Metadata & Technical (JetBrains Mono):** Used for timers, difficulty tiers, score breakdowns, and system status. The monospaced nature emphasizes the "simulated" and precise nature of the training.

All labels should utilize a slightly wider letter-spacing (0.05em) to maintain a clean, technical appearance.

## Layout & Spacing

The layout follows a strict 12-column grid with generous 24px gutters. Elements are intentionally spaced using a 4px baseline shift to ensure mathematical precision.

-   **Structure:** Content is housed in "Glass Containers" that float above the warm background.
-   **Offset Shadows:** Interactive elements (buttons, active cards) utilize a hard 6px offset shadow (bottom-right) using the #1A1A1A color at 100% opacity, creating the Neo-Brutalist "lift."
-   **Mobile Adaption:** On mobile, the 6px offset shadows are reduced to 4px to maintain visual balance, and side margins shrink to 16px.

## Elevation & Depth

This system ignores standard blurry ambient shadows in favor of structural depth:

1.  **Level 0 (Background):** #FCFAF7 (Warm off-white). Contains Memphis-style dot grid patterns in #1A1A1A at 5% opacity.
2.  **Level 1 (Surface):** Glassmorphic cards. Translucent white with 1px #1A1A1A borders. No shadow.
3.  **Level 2 (Interactive):** Buttons and Input fields. Solid fills with 1px borders and a 6px hard offset shadow. 
4.  **Level 3 (Overlay):** Modals and dropdowns. These feature a thicker 2px border and an increased backdrop blur (40px) to completely isolate the user from the background simulation.

## Shapes

The shape language is "Geometric Hybrid." While the borders and shadows are brutalist and sharp in their execution, the corners are comfortably rounded.

-   **Cards/Containers:** 20px corner radius (`rounded-xl` equivalent).
-   **Buttons/Inputs:** 8px corner radius (`rounded-md` equivalent).
-   **Accents:** Circular dot patterns and perfectly round geometric accents contrast against the rectangular grid.

## Components

### Buttons
- **Primary:** Electric Blue fill, White text (Space Grotesk Bold), 1px black border, 6px black offset shadow. On hover, the shadow disappears (button "depresses").
- **Secondary:** White fill, Black text, 1px black border, 4px black offset shadow.

### Cards (The "Glass" Unit)
- Background: `#FFFFFFCC` with `backdrop-filter: blur(20px)`.
- Border: 1px `#1A1A1A`.
- Padding: 32px for desktop, 20px for mobile.

### Inputs
- Background: Solid White.
- Border: 1px `#1A1A1A`.
- Focus State: 2px `#0052FF` border with the 6px offset shadow changing color to `#0052FF`.

### Data Visualization
- Graphs should use solid fills of Chartreuse, Coral, and Lavender.
- Use JetBrains Mono for all axis labels and data points.
- Implement "Editorial" style grid lines—thin 1px dashed lines in `#1A1A1A` (20% opacity).

### Chips/Tags
- Small, pill-shaped elements with `#1A1A1A` 1px borders and no shadows. Backgrounds should be light tints of the accent colors.