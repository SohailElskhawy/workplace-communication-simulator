# Kalemny product system

The refreshed Kalemny system retains the existing off-white canvas and electric-blue identity while replacing hard neo-brutalist pressure with calm coaching surfaces, human typography, logical-direction layout, and restrained state communication.

## Core tokens

```css
:root {
  --bg: oklch(98.41% 0.0035 39.48);
  --surface: oklch(100% 0 0);
  --fg: oklch(22.32% 0.0016 17.27);
  --muted: oklch(39.77% 0.0272 276.75);
  --border: oklch(82.81% 0.0279 281.22);
  --accent: oklch(52.82% 0.2628 262.87);
}
```

The values are OKLch conversions of the existing Kalemny design source colors: background `#fcf9f8`, surface `#ffffff`, foreground `#1c1b1b`, muted foreground `#434656`, outline variant `#c3c5d9`, and primary `#0052ff`.

## Font stacks

- Display: `Charter, "Iowan Old Style", Georgia, "Noto Naskh Arabic", serif`
- Body: `"Noto Sans Arabic", var(--font-inter), "Segoe UI", system-ui, sans-serif`
- Mono: `var(--font-jetbrains-mono), "SFMono-Regular", Consolas, monospace`

## Visual language

1. Use the accent for current selection, primary action, and live conversation state—not for decoration across every surface.
2. Use white surfaces, neutral 1px borders, and soft ambient elevation; reserve stronger separation for overlays and errors.
3. Prefer sentence case and generous space. Mono typography is limited to scores, timers, keyboard shortcuts, and compact metadata.
4. Use one small speech-pulse motif around the active voice control as the distinctive Kalemny flourish.
5. Build layouts and message alignment with logical properties so the same components work in LTR and RTL.
