# Milestone M05: Call Simulation Workspace — Design Specification

## 1. Overview & Objectives

**Milestone**: M05 — Call Simulation Workspace (Phase 3: Core Simulation Loop)  
**Governing Documents**:
- [REDESIGN_PLAN.md](../../REDESIGN_PLAN.md) (Decisions D06, D07, D09, Tasks R16–R20)
- [WARM_CORAL_DESIGN.md](../../WARM_CORAL_DESIGN.md) (Section 6 Mobile Simulation Workspace, Section 7.2 Screen 3, Section 7.3 Copy Inventory)
- [PROJECT_STATE.md](../../PROJECT_STATE.md) (Active Milestone M05)

### Objectives
1. **R16 — Static Fictional Counterpart Portraits**:
   - Replace the legacy abstract conversation orb with static, realistic adult counterpart portraits.
   - Use bundled image assets (`1.png`–`6.png`) mapped via `lib/scenario-images.ts` for curated scenarios, with a designated default portrait for custom interview rehearsals.
   - Display counterpart name, job role, and an explicit "AI Roleplay Partner" badge.
2. **R17 — Continuously Visible Transcript**:
   - Provide a permanently visible message stream on both desktop and mobile, completely eliminating the legacy hidden drawer (`TranscriptDrawer`).
   - Desktop: expansive split-pane layout with the Counterpart Stage on the left and the scrolling transcript on the right.
   - Mobile: vertical stacked layout with auto-scrolling to newest turns and a floating "Jump to latest" pill when scrolled up.
3. **R18 — Mobile Controls & Dual-Row Composer**:
   - Full-width text composer row (`min-h-[44px] max-h-[96px]`) with inline Send button.
   - Separate dedicated microphone row below the composer with a 44px "Tap to talk" pill, live recording timer, wave pulse, and Done/Cancel controls.
   - Fluid mobile keyboard open transition: Counterpart Stage collapses into a 36px mini-strip and the mic row yields space to avoid screen overflow while typing.
4. **R19 — Push-to-Talk Audio Capture & Whisper STT**:
   - Buffer temporary voice audio in browser memory; transcribe via backend in-memory Whisper STT (zero raw audio persistence).
   - Dual-anchor barge-in: clicking "Stop audio" on the counterpart stage OR tapping the microphone button immediately interrupts playing neural voice audio.
5. **R20 — Continuous Hands-Free Call Mode (`REALTIME`)**:
   - Adapt `REALTIME` mode to the Warm Coral workspace shell with live Web Audio VAD, speech interruption, and seamless hybrid text composer fallback.

---

## 2. Architecture & Viewport Layouts

### 2.1 Desktop Viewport (`>=1024px`) — Split-Pane Layout
- **Container**: `min-h-[calc(100dvh-64px)] grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 p-4 sm:p-6`.
- **Left Pane (Counterpart Stage)**:
  - Counterpart portrait (80×80px rounded card), name, role, AI roleplay partner chip.
  - Live conversational state badge ("Your turn", "Listening…", "Transcribing…", "Preparing response…", "AI speaking").
  - Frequency soundwave visualization and prominent "Stop audio" button (`min-h-[44px]`).
  - Expandable scenario briefing accordion ("Your Role", "Primary Objective", "Stakes").
- **Right Pane (Simulation Workspace)**:
  - Continuously visible scrolling transcript filling available height.
  - Docked bottom interaction controller (dual-row composer + mic row for `PUSH_TO_TALK`, or live call bar for `REALTIME`).

### 2.2 Mobile Viewport (`<1024px`) — Stacked Budgeted Layout

| Component Zone | Height (Keyboard Closed) | Height (Keyboard Open ~280px) |
|---|---|---|
| **Simulation Header** | 48px | 48px |
| **Counterpart Stage** | 124px (compact portrait 60px) | **36px (mini horizontal strip)** |
| **Scrolling Transcript** | ~320px–470px (auto-scroll) | **~240px–390px (visible bubbles)** |
| **Full-Width Composer Row** | 56px (full width) | 56px (docked above keyboard) |
| **Dedicated Mic Row** | 52px ("Tap to talk" pill) | *Collapsed into composer mic icon* |

---

## 3. Component Hierarchy & Details

### 3.1 Counterpart Stage (`apps/web/src/components/simulations/counterpart-stage.tsx`)
```ts
export interface CounterpartStageProps {
  scenarioKey: string;
  scenarioTitle: string;
  counterpartName: string;
  counterpartRole: string;
  userRole: string;
  userObjective: string;
  stakes?: string;
  isCustom?: boolean;
  uiState: SimulationUiState;
  counterpartSpeechStatus: SpeechPlaybackStatus;
  onStopAudio: () => void;
  isKeyboardOpen?: boolean;
}
```
- **Portrait**: Rendered using Next.js `Image` from `getScenarioImage(scenarioKey)`. Fallback to `2.png` for custom interview scenarios.
- **State Badges**:
  - `YOUR_TURN`: *"Your turn to speak / دورك في الحديث"* (`bg-primary-muted text-primary`)
  - `LISTENING`: *"Listening… / نستمع إليك الآن…"* (`bg-surface-subtle text-foreground animate-pulse`)
  - `TRANSCRIBING`: *"Transcribing your voice… / جارٍ تحويل الصوت إلى نص…"* (`bg-surface-subtle text-foreground`)
  - `AI_THINKING`: *"Preparing response… / المحاور يجهز الرد الآن…"* (`bg-surface-subtle text-foreground`)
  - `AI_SPEAKING`: *"Counterpart is speaking / المحاور يتحدث"* (`bg-success-surface text-success-foreground`)
  - `MIC_ERROR`: *"Microphone unavailable / الميكروفون غير متوفر"* (`bg-alert-surface text-alert-foreground`)
- **Barge-in Button**: When `counterpartSpeechStatus === 'playing'`, render *"Stop audio / إيقاف الصوت"* button directly beside the status badge.
- **Keyboard-Collapsed Mini Strip**: When `isKeyboardOpen === true` on mobile, collapse to `h-9 px-3 flex items-center gap-2 border-b border-border-subtle bg-surface-solid`.

### 3.2 Continuously Visible Transcript (`apps/web/src/components/simulations/visible-transcript-view.tsx`)
```ts
export interface VisibleTranscriptViewProps {
  turns: ConversationTurn[];
  pendingTurn?: PendingTurnState | null;
  counterpartName: string;
  counterpartRole: string;
  onReplaySpeech?: (turnId: string, text: string) => void;
  onRetryTurn?: (turnId: string) => void;
  retryingTurnId?: string | null;
  playingTurnId?: string | null;
}
```
- **Bubble Alignment**:
  - Counterpart turns: start-aligned (`ms-0 me-auto max-w-[85%] sm:max-w-[75%]`), `bg-surface-solid border border-border-subtle rounded-card p-4 shadow-xs`. Includes `SpeechButton` to replay speech.
  - Learner turns: end-aligned (`ms-auto me-0 max-w-[85%] sm:max-w-[75%]`), `bg-primary-muted border border-primary/20 rounded-card p-4 text-foreground`. Includes Turn number and input badge (Voice vs. Typed).
- **Auto-Scroll & Floating Jump Button**:
  - Automatically scrolls to latest message when `turns.length` increases.
  - Detects user scroll-up and conditionally renders floating pill button: *"Jump to latest / الانتقال إلى الأحدث"* (`bg-surface-solid border border-border shadow-raised min-h-[44px]`).

### 3.3 Simulation Composer & Dedicated Mic Row (`apps/web/src/components/simulations/simulation-composer.tsx`)
```ts
export interface SimulationComposerProps {
  text: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  isSending?: boolean;
  voiceStatus: "idle" | "requesting_permission" | "recording" | "transcribing" | "error";
  onStartVoice: () => void;
  onStopVoice: () => void;
  onCancelVoice: () => void;
  recordingSeconds: number;
  maxRecordingSeconds?: number;
  microphoneLevel: number;
  isCounterpartSpeaking?: boolean;
  onInterruptAudio?: () => void;
}
```
- **Row 1 (Text Composer)**:
  - Full width textarea (`min-h-[44px] max-h-[96px]`) with responsive padding.
  - Inline Send button (`min-h-[44px] min-w-[44px] bg-primary text-primary-foreground`).
- **Row 2 (Dedicated Microphone Row)**:
  - Idle state: centered pill button *"Tap to talk / اضغط للتحدث"* (`min-h-[44px] px-8 rounded-full bg-primary text-primary-foreground`). If counterpart is speaking, displays *"Tap to interrupt / اضغط للمقاطعة"*.
  - Recording state: Live timer (`0:14 / 2:00`), audio level indicator bar, prominent *"Done / تم"* button, and secondary *"Cancel / إلغاء"* button.
  - Mobile keyboard collapse: Mic row hides when mobile keyboard is open; compact mic icon appears in composer row.

### 3.4 Live Call Bar (`apps/web/src/components/simulations/live-call-bar.tsx`)
```ts
export interface LiveCallBarProps {
  connected: boolean;
  microphoneLevel: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isCounterpartSpeaking: boolean;
  onInterruptAudio: () => void;
  onToggleTyping: () => void;
  isTypingOpen: boolean;
}
```
- Real-time hands-free status with connected indicator and live voice activity visualizer.
- Mute/Unmute microphone button (`min-h-[44px]`).
- *"Type response / اكتب رداً"* toggle expanding text composer and pausing VAD detection while typing.

---

## 4. State Lifecycle & Audio Interruption

### 4.1 Push-to-Talk Lifecycle
1. User taps "Tap to talk" or holds Spacebar -> `voiceStatus: "recording"`.
2. Temporary audio buffer captured in browser memory via `MediaRecorder`.
3. User taps "Done" or releases Spacebar -> `voiceStatus: "transcribing"`.
4. Audio blob sent to `/api/v1/attempts/:attemptId/transcriptions` via `multipart/form-data`.
5. Backend runs Whisper STT in-memory (zero persistence) -> returns `{ transcript: string }`.
6. Composer textarea populates with transcript -> `voiceStatus: "idle"`.
7. User reviews/edits and taps Send -> `POST /api/v1/attempts/:attemptId/turns`.

### 4.2 Barge-In Interruption Lifecycle
1. AI counterpart speaks via Edge-TTS audio stream.
2. If learner taps "Stop audio" on the counterpart stage OR taps "Tap to interrupt" on the mic row:
   - Audio playback halts immediately (`audio.pause(); audio.currentTime = 0;`).
   - If mic row was tapped, voice recording starts immediately.

### 4.3 REALTIME Hands-Free Lifecycle
1. Web Audio VAD monitors microphone audio level.
2. Vocal speech threshold reached -> automatic speech buffering.
3. Silence threshold reached -> automatic Whisper transcription and turn dispatch.
4. AI speech response synthesizes and auto-plays.
5. If user begins speaking during AI speech -> VAD detects user voice, halts playback, and captures interruption turn.
6. If user opens text composer -> VAD paused until user sends or closes composer.

---

## 5. Accessibility, Ergonomics & Bilingual Parity

1. **Strict 44px Touch Targets**: Send button, Tap to talk pill, Stop playback button, Mute button, Finish conversation button all enforce `min-h-[44px] min-w-[44px]`.
2. **Keyboard Accessibility**:
   - Desktop: Spacebar pushes to talk when text composer is not focused.
   - Escape closes dialogs or cancels active voice recording.
3. **Screen Reader Support**:
   - Transcript container has `role="log"` and `aria-live="polite"`.
   - Audio waveforms marked `aria-hidden="true"`.
4. **Bilingual Parity**:
   - Full Modern Standard Arabic (MSA) for all UI controls, status badges, timers, error messages, and finish dialogs.
   - Directional icons mirrored in RTL via `.directional-icon`.
   - Arabic text maintains `tracking-normal` (zero letter spacing).

---

## 6. Testing Strategy

1. **Component Unit Tests**:
   - `counterpart-stage.test.tsx`: Tests portrait loading, name/role, state badges, soundwave visibility, stop audio action, and mobile collapse.
   - `visible-transcript-view.test.tsx`: Tests bubble alignment, SpeechButton audio trigger, retry turn trigger, auto-scroll, and "Jump to latest" pill.
   - `simulation-composer.test.tsx`: Tests full-width textarea, inline send button, dedicated mic row, Done/Cancel recording, and mobile collapse.
   - `live-call-bar.test.tsx`: Tests connection badge, VAD visualizer, mute toggle, and hybrid typing toggle.
2. **Page Integration Tests**:
   - `simulations/[attemptId]/page.test.tsx`: Tests simulation initialization, push-to-talk turn submission, realtime hands-free mode, finish dialog flow, and error states.
3. **Quality Gates**:
   - Full monorepo typecheck (`pnpm typecheck`).
   - Full workspace linter (`pnpm lint`).
   - Complete unit and integration test suite (`pnpm test`).
