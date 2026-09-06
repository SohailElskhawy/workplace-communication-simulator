# REDESIGN_TECHNICAL_DECISIONS.md

## 1. Testing Access Policy (M03)
- All authenticated testers have free access to curated scenarios and custom interview generation.
- Quota: 3 combined simulation starts per rolling 7 days.
- Retries count as new starts. Generating an interview scenario does not count as a start. Attempt deletion never restores quota.

## 2. Bilingual Architecture (M02 / M03 / M06)
- Interface Locale (MSA UI strings) is distinct from Practice Language (`en` or `ar` with Egyptian/Gulf dialect).
- Practice language is chosen at attempt creation and persisted on `SimulationAttempt`.
- Evaluation output language matches attempt practice language; surrounding UI labels match interface locale.
- Stored learner messages and evaluations are never retranslated or modified on a locale switch.

## 3. Counterpart Portraits (M05)
- Fictional adult portraits are static, bundled application assets (one per curated scenario + default for custom interviews).
- Mapped deterministically by scenario; AI roleplay partner is clearly labeled.
- No camera access, video streaming, lip-sync animation, or per-turn image generation.

## 4. In-Memory Audio & Speech (M05)
- Push-to-talk buffers temporary audio in browser memory; Whisper STT runs in-memory on backend. Zero raw audio persistence.
- Edge-TTS synthesizes neural voice on demand via backend adapter; temporary audio streams are discarded after playback.
- Continuous hands-free call mode (`REALTIME`) uses client-side Web Audio VAD with speech interruption.
