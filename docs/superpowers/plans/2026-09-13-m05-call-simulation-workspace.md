# Milestone M05: Call Simulation Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the unified Warm Coral Call Simulation Workspace (`/app/simulations/[attemptId]`) with static adult counterpart portraits, continuously visible transcript, mobile keyboard collapse states, push-to-talk audio capture with Whisper STT, dual-anchor barge-in, and continuous hands-free call mode (`REALTIME`).

**Architecture:** A single unified `CallSimulationWorkspace` shell hosts the simulation header, `CounterpartStage` (with static portraits and live soundwave/stop playback), and `VisibleTranscriptView` (permanently visible message bubbles). On desktop, the stage and transcript sit side-by-side in a split-pane layout; on mobile, they stack vertically with a 124px-to-36px collapsible counterpart stage upon keyboard focus. The bottom dock switches between `SimulationComposer` (full-width composer + dedicated mic row) for Push-to-Talk and `LiveCallBar` for continuous hands-free Live Call mode with hybrid typing fallback.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Web Audio API, MediaRecorder, Edge-TTS playback, Clerk Auth, `@kalemny/contracts`, Vitest, React Testing Library.

## Global Constraints

- **Light mode only**: `color-scheme: light`. No dark theme.
- **No neo-brutalism**: Zero hard 2px black outlines, zero offset black drop-shadows (e.g. `shadow-[...#000]`), zero comic-strip borders.
- **No blue/purple gradients**: Eliminate legacy electric blue (`#0052ff`) and purple hues.
- **Bilingual Parity**: Complete Modern Standard Arabic (MSA) and English (EN) parity with `useLocale()`.
- **Arabic Typography**: Arabic text must strictly maintain `tracking-normal` (zero letter spacing).
- **Interactive Targets**: All interactive elements (buttons, inputs, pills, select triggers) must meet a minimum `44px × 44px` touch target (`min-h-[44px]`).
- **Logical CSS Properties**: Use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. Directional icons mirrored in RTL via `.directional-icon`. Non-directional visuals never mirrored.
- **Zero Raw Audio Storage**: In-memory audio buffers only. Whisper STT and Edge-TTS streams run in-memory; no audio files stored in DB or disk.
- **No TDD Rule**: Do not work with strict TDD failure loops. Write implementation and critical tests alongside each deliverable.

---

## File Structure

```
apps/web/src/
  ├── components/simulations/
  │     ├── counterpart-stage.tsx                        (Create: static portrait & status stage)
  │     ├── counterpart-stage.test.tsx                   (Create: tests for counterpart stage)
  │     ├── visible-transcript-view.tsx                  (Create: permanently visible transcript stream)
  │     ├── visible-transcript-view.test.tsx             (Create: tests for visible transcript)
  │     ├── simulation-composer.tsx                      (Modify: Warm Coral composer + dedicated mic row)
  │     ├── simulation-composer.test.tsx                 (Modify: tests for simulation composer)
  │     ├── live-call-bar.tsx                            (Create: hands-free call controller bar)
  │     ├── live-call-bar.test.tsx                       (Create: tests for live call bar)
  │     ├── conversation-orb.tsx                         (Delete: legacy orb dead code)
  │     ├── transcript-drawer.tsx                        (Delete: legacy drawer dead code)
  │     ├── transcript-drawer.test.tsx                   (Delete: legacy drawer test)
  │     ├── conversation-stage.tsx                       (Delete: legacy stage dead code)
  │     ├── conversation-stage.test.tsx                  (Delete: legacy stage test)
  │     ├── live-call-stage.tsx                          (Delete: legacy stage dead code)
  │     └── live-call-stage.test.tsx                     (Delete: legacy stage test)
  └── app/app/simulations/[attemptId]/
        ├── page.tsx                                     (Modify: unified Call Simulation Workspace)
        └── page.test.tsx                                (Modify: end-to-end simulation page tests)
```

---

### Task 1: CounterpartStage Component with Static Portraits & Dual-Anchor Barge-In (R16, R19)

**Files:**
- Create: `apps/web/src/components/simulations/counterpart-stage.tsx`
- Create: `apps/web/src/components/simulations/counterpart-stage.test.tsx`

**Interfaces:**
- Consumes: `getScenarioImage` from `@/lib/scenario-images`, `useLocale` from `@/lib/locale-context`, `@/components/icons` (`SpeakingWithIcon`, `StopIcon`, `ChevronDownIcon`), `SpeechPlaybackStatus`.
- Produces: `CounterpartStage` component with props:
  ```ts
  export type SimulationUiState =
    | "YOUR_TURN"
    | "LISTENING"
    | "TRANSCRIBING"
    | "REVIEWING"
    | "AI_THINKING"
    | "AI_SPEAKING"
    | "MIC_ERROR";

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

- [ ] **Step 1: Implement CounterpartStage**

Create `apps/web/src/components/simulations/counterpart-stage.tsx`:
- Render static fictional adult portrait:
  - Curated: `getScenarioImage(scenarioKey)`.
  - Custom: fallback to `2.png` via `getScenarioImage("behavioral-interview")` or neutral avatar.
  - Sizing: Desktop `80×80px` rounded card (`rounded-2xl border border-border-subtle shadow-xs`); Mobile closed `60×60px`; Mobile keyboard-collapsed `28×28px`.
- State Badges:
  - `YOUR_TURN`: *"Your turn to speak / دورك في الحديث"* (`bg-primary-muted text-primary`)
  - `LISTENING`: *"Listening… / نستمع إليك الآن…"* (`bg-surface-subtle text-foreground animate-pulse`)
  - `TRANSCRIBING`: *"Transcribing your voice… / جارٍ تحويل الصوت إلى نص…"* (`bg-surface-subtle text-foreground`)
  - `AI_THINKING`: *"Preparing response… / المحاور يجهز الرد الآن…"* (`bg-surface-subtle text-foreground`)
  - `AI_SPEAKING`: *"Counterpart is speaking / المحاور يتحدث"* (`bg-success-surface text-success-foreground`)
  - `MIC_ERROR`: *"Microphone unavailable / الميكروفون غير متوفر"* (`bg-alert-surface text-alert-foreground`)
- Soundwave Animation: when `counterpartSpeechStatus === 'playing'`, render animated frequency wave bars (`aria-hidden="true"`).
- Stop Playback Action: when `counterpartSpeechStatus === 'playing'`, render *"Stop audio / إيقاف الصوت"* button directly beside the status badge (`bg-primary text-primary-foreground min-h-[44px] min-w-[44px]`).
- Keyboard Collapse Transition: when `isKeyboardOpen === true` on mobile, render compact 36px horizontal strip (`h-9 px-3 flex items-center gap-2 border-b border-border-subtle bg-surface-solid`).
- Briefing Accordion: on desktop, render collapsible card below the portrait detailing *"Your Role"*, *"Primary Objective"*, and *"Stakes"*.

- [ ] **Step 2: Write tests for CounterpartStage**

Create `apps/web/src/components/simulations/counterpart-stage.test.tsx` verifying:
1. Renders portrait, counterpart name, role, and AI roleplay partner badge.
2. Renders correct state badges across all `SimulationUiState` values in English and Arabic.
3. Renders soundwave and calls `onStopAudio` when "Stop audio" button is clicked.
4. Renders collapsed mini-strip when `isKeyboardOpen={true}`.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test src/components/simulations/counterpart-stage.test.tsx`  
Commit:
```bash
git add apps/web/src/components/simulations/counterpart-stage.tsx apps/web/src/components/simulations/counterpart-stage.test.tsx
git commit -m "feat(web): implement CounterpartStage with static portraits and dual-anchor barge-in"
```

---

### Task 2: Continuously Visible Transcript View Component (R17)

**Files:**
- Create: `apps/web/src/components/simulations/visible-transcript-view.tsx`
- Create: `apps/web/src/components/simulations/visible-transcript-view.test.tsx`

**Interfaces:**
- Consumes: `@kalemny/contracts` (`ConversationTurn`), `SpeechButton`, `useLocale`, `@/components/icons` (`ArrowDownIcon`, `RefreshIcon`).
- Produces: `VisibleTranscriptView` component with props:
  ```ts
  export interface PendingTurnState {
    text: string;
    inputMethod: "VOICE" | "TEXT";
    status: "sending" | "transcribing" | "error";
  }

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

- [ ] **Step 1: Implement VisibleTranscriptView**

Create `apps/web/src/components/simulations/visible-transcript-view.tsx`:
- Container: `flex-1 overflow-y-auto p-4 sm:p-6 space-y-4` with `role="log"` and `aria-live="polite"`.
- Counterpart Bubbles:
  - Start-aligned (`ms-0 me-auto max-w-[85%] sm:max-w-[75%]`).
  - Styling: `bg-surface-solid border border-border-subtle rounded-card p-4 shadow-xs`.
  - Header: Counterpart name, role, and on-demand `SpeechButton` to replay audio.
- Learner Bubbles:
  - End-aligned (`ms-auto me-0 max-w-[85%] sm:max-w-[75%]`).
  - Styling: `bg-primary-muted border border-primary/20 rounded-card p-4 text-foreground`.
  - Header: Turn number (`Turn {index + 1}` / `الجولة {index + 1}`), input badge (`Voice` / `Typed`).
  - Retry Action: if `onRetryTurn` is provided, render *"Retry this turn / إعادة هذه الجولة"* button (`min-h-[44px]`).
- Pending Turn Bubble: if `pendingTurn` is active, render optimistic bubble with loading pulse.
- Scroll Management:
  - Auto-scroll to bottom on new turns via `scrollIntoView({ behavior: 'smooth' })`.
  - Track scroll position: if learner scrolls up > 100px from bottom, render floating pill button at bottom center: *"Jump to latest / الانتقال إلى الأحدث"* (`bg-surface-solid border border-border shadow-raised min-h-[44px] px-4 rounded-full text-xs font-semibold`).

- [ ] **Step 2: Write tests for VisibleTranscriptView**

Create `apps/web/src/components/simulations/visible-transcript-view.test.tsx` verifying:
1. Renders counterpart and learner bubbles with proper start/end alignment.
2. Renders turn badges and input method labels in English and Arabic.
3. Fires `onReplaySpeech` when speech replay button is clicked.
4. Fires `onRetryTurn` when retry button is clicked.
5. Displays floating "Jump to latest" button when scrolled up.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test src/components/simulations/visible-transcript-view.test.tsx`  
Commit:
```bash
git add apps/web/src/components/simulations/visible-transcript-view.tsx apps/web/src/components/simulations/visible-transcript-view.test.tsx
git commit -m "feat(web): implement VisibleTranscriptView with auto-scroll and jump-to-latest"
```

---

### Task 3: Redesign SimulationComposer & Dedicated Microphone Row (R18, R19)

**Files:**
- Modify: `apps/web/src/components/simulations/simulation-composer.tsx`
- Modify: `apps/web/src/components/simulations/simulation-composer.test.tsx`

**Interfaces:**
- Consumes: `useLocale`, `@/components/icons` (`SendIcon`, `MicIcon`, `CheckIcon`, `XIcon`, `RefreshIcon`).
- Produces: Updated `SimulationComposer` component with props:
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
    isKeyboardOpen?: boolean;
  }
  ```

- [ ] **Step 1: Refactor SimulationComposer styling and layout**

In `apps/web/src/components/simulations/simulation-composer.tsx`:
1. Remove all legacy brutalist classes (`shadow-[3px_...#1a1a1a]`, `shadow-[4px_...#1a1a1a]`, `brutalist-interactive`, harsh black borders).
2. Row 1 (Text Composer):
   - Full-width textarea spanning 100% width (`min-h-[44px] max-h-[96px] bg-background border border-border rounded-control p-3`).
   - Inline Send button: `min-h-[44px] min-w-[44px] bg-primary text-primary-foreground rounded-control flex items-center justify-center transition-colors hover:bg-primary/90 disabled:opacity-50`.
   - Compact mic toggle: rendered inside composer row only when mobile keyboard is open (`isKeyboardOpen === true`).
3. Row 2 (Dedicated Microphone Row):
   - Sits below composer row. Hidden when mobile keyboard is open.
   - Idle State: centered pill button *"Tap to talk / اضغط للتحدث"* (`min-h-[44px] px-8 rounded-full bg-primary text-primary-foreground font-semibold shadow-xs flex items-center gap-2`). If `isCounterpartSpeaking === true`, label changes to *"Tap to interrupt / اضغط للمقاطعة"*.
   - Recording State:
     - Real-time timer counter (`0:14 / 2:00` formatted with JetBrains Mono font).
     - Audio level pulse bar reflecting `microphoneLevel`.
     - Primary *"Done / تم"* button (`bg-primary text-primary-foreground min-h-[44px] px-5 rounded-full font-semibold`).
     - Secondary *"Cancel / إلغاء"* button (`border border-border min-h-[44px] px-4 rounded-full`).
4. Bilingual Parity: use `useLocale()` for all placeholders, timer formats, button labels, and screen reader announcements.

- [ ] **Step 2: Update and run SimulationComposer tests**

Update `apps/web/src/components/simulations/simulation-composer.test.tsx` verifying:
1. Renders full-width textarea and inline send button.
2. Renders dedicated microphone row in idle state.
3. Renders recording timer, audio visualizer, Done, and Cancel buttons during voice recording.
4. Tapping mic button while counterpart is speaking invokes `onInterruptAudio` or `onStartVoice`.
5. Folds mic row when `isKeyboardOpen={true}`.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test src/components/simulations/simulation-composer.test.tsx`  
Commit:
```bash
git add apps/web/src/components/simulations/simulation-composer.tsx apps/web/src/components/simulations/simulation-composer.test.tsx
git commit -m "refactor(web): redesign SimulationComposer with Warm Coral tokens and dedicated mic row"
```

---

### Task 4: LiveCallBar Component for REALTIME Mode (R20)

**Files:**
- Create: `apps/web/src/components/simulations/live-call-bar.tsx`
- Create: `apps/web/src/components/simulations/live-call-bar.test.tsx`

**Interfaces:**
- Consumes: `useLocale`, `@/components/icons` (`PhoneIcon`, `MicIcon`, `MicOffIcon`, `ChatIcon`, `StopIcon`).
- Produces: `LiveCallBar` component with props:
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

- [ ] **Step 1: Implement LiveCallBar**

Create `apps/web/src/components/simulations/live-call-bar.tsx`:
- Container: `border-t border-border-subtle bg-surface-solid p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs`.
- Status Indicator: pulsing green dot with label *"Connected • Live Call / متصل • مكالمة صوتية مباشرة"*.
- Audio Activity Visualizer: dynamic waveform representing `microphoneLevel` (learner voice activity).
- Mute/Unmute Toggle Button: `min-h-[44px] min-w-[44px] rounded-full border border-border bg-surface-subtle flex items-center justify-center text-foreground hover:bg-surface-solid`.
- Barge-in Trigger: if `isCounterpartSpeaking === true`, render prominent *"Tap to interrupt / اضغط للمقاطعة"* button.
- Hybrid Typing Toggle: *"Type response / اكتب رداً"* button (`min-h-[44px] border border-border rounded-control px-4 text-xs font-semibold`).

- [ ] **Step 2: Write tests for LiveCallBar**

Create `apps/web/src/components/simulations/live-call-bar.test.tsx` verifying:
1. Renders live call connection badge and audio visualizer.
2. Invokes `onToggleMute` when mute button is clicked.
3. Invokes `onInterruptAudio` when interrupt button is clicked during speech.
4. Invokes `onToggleTyping` when typing button is clicked.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test src/components/simulations/live-call-bar.test.tsx`  
Commit:
```bash
git add apps/web/src/components/simulations/live-call-bar.tsx apps/web/src/components/simulations/live-call-bar.test.tsx
git commit -m "feat(web): implement LiveCallBar for continuous hands-free REALTIME mode"
```

---

### Task 5: Integrate Unified Call Simulation Workspace in `/app/simulations/[attemptId]` (R16–R20)

**Files:**
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.tsx`
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.test.tsx`

**Interfaces:**
- Consumes: `CounterpartStage`, `VisibleTranscriptView`, `SimulationComposer`, `LiveCallBar`, `FinishSimulationDialog`, `createApiClient`, `SpeechPlaybackController`, `useVoiceRecorder`.
- Produces: Fully integrated Warm Coral simulation workspace supporting both PTT and REALTIME modes.

- [ ] **Step 1: Rewrite SimulationPage workspace layout and lifecycle**

In `apps/web/src/app/app/simulations/[attemptId]/page.tsx`:
1. Remove references to legacy `TranscriptDrawer`, `ConversationStage`, `LiveCallStage`, `ConversationOrb`.
2. Implement viewport keyboard detection:
   - Listen to `window.visualViewport?.addEventListener('resize', ...)` or track focus on composer textarea to toggle `isKeyboardOpen`.
3. Render Unified Layout:
   - Header: Back to practice link (`/app`), scenario title, elapsed timer, *"Finish conversation / إنهاء المحادثة"* button (`min-h-[44px]`).
   - Desktop Split-Pane (`lg:grid lg:grid-cols-[360px_1fr]`):
     - Left pane: `CounterpartStage` with static portrait, state badge, soundwave, stop audio button, and briefing accordion.
     - Right pane: `VisibleTranscriptView` filling height + Docked interaction controller.
   - Mobile Stacked Layout (`<1024px`):
     - Collapsible `CounterpartStage` (124px closed -> 36px mini strip when `isKeyboardOpen === true`).
     - `VisibleTranscriptView` filling flexible height (`flex-1`).
     - Docked controller pinned at bottom.
4. Docked Controller Logic:
   - If `attempt.interactionMode === "REALTIME"`:
     - Render `LiveCallBar`.
     - If `isTypingOpen === true`: render expandable `SimulationComposer` above the live call bar, temporarily muting VAD speech detection while typing.
   - If `attempt.interactionMode !== "REALTIME"`:
     - Render `SimulationComposer` (composer textarea + dedicated microphone row).
5. Dual-Anchor Barge-In:
   - Stopping audio via `CounterpartStage` or tapping mic button halts `SpeechPlaybackController` immediately.
6. Connect Finish Conversation Dialog:
   - Opens `FinishSimulationDialog` on clicking header finish button.
   - On submit, calls `client.finishSimulation(token, attemptId)` and navigates to `/app/results/${encodeURIComponent(attemptId)}`.

- [ ] **Step 2: Update and run SimulationPage integration tests**

Update `apps/web/src/app/app/simulations/[attemptId]/page.test.tsx` verifying:
1. Renders `CounterpartStage` with static portrait and `VisibleTranscriptView` side-by-side.
2. Handles push-to-talk voice recording, Whisper transcription, and turn sending.
3. Handles REALTIME mode with `LiveCallBar` and hybrid text toggle.
4. Dual-anchor barge-in stops counterpart speech playback.
5. Finish conversation dialog transitions to results screen.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test src/app/app/simulations/[attemptId]/page.test.tsx`  
Commit:
```bash
git add apps/web/src/app/app/simulations/[attemptId]/page.tsx apps/web/src/app/app/simulations/[attemptId]/page.test.tsx
git commit -m "feat(web): integrate unified CallSimulationWorkspace in simulation attempt route"
```

---

### Task 6: Clean Up Legacy Orb & Drawer Dead Code

**Files:**
- Delete: `apps/web/src/components/simulations/conversation-orb.tsx`
- Delete: `apps/web/src/components/simulations/transcript-drawer.tsx`
- Delete: `apps/web/src/components/simulations/transcript-drawer.test.tsx`
- Delete: `apps/web/src/components/simulations/conversation-stage.tsx`
- Delete: `apps/web/src/components/simulations/conversation-stage.test.tsx`
- Delete: `apps/web/src/components/simulations/live-call-stage.tsx`
- Delete: `apps/web/src/components/simulations/live-call-stage.test.tsx`

- [ ] **Step 1: Remove legacy files**

Delete the 7 deprecated simulation files that have been superseded by `CounterpartStage`, `VisibleTranscriptView`, and `LiveCallBar`.

- [ ] **Step 2: Verify zero broken imports**

Run `pnpm typecheck` to verify no remaining imports target the deleted components.

- [ ] **Step 3: Commit dead code removal**

```bash
git rm apps/web/src/components/simulations/conversation-orb.tsx apps/web/src/components/simulations/transcript-drawer.tsx apps/web/src/components/simulations/transcript-drawer.test.tsx apps/web/src/components/simulations/conversation-stage.tsx apps/web/src/components/simulations/conversation-stage.test.tsx apps/web/src/components/simulations/live-call-stage.tsx apps/web/src/components/simulations/live-call-stage.test.tsx
git commit -m "refactor(web): remove deprecated conversation orb, stage, and transcript drawer components"
```

---

### Task 7: Integration Verification & Release Gate

**Files:**
- Modify: `docs/PROJECT_STATE.md`
- Modify: `docs/REDESIGN_PLAN.md`

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`  
Expected: 0 errors across all workspaces (`packages/contracts`, `apps/api`, `apps/web`).

- [ ] **Step 2: Run linter**

Run: `pnpm lint`  
Expected: 0 lint errors.

- [ ] **Step 3: Run test suite**

Run: `pnpm test`  
Expected: All tests passing across the monorepo.

- [ ] **Step 4: Update PROJECT_STATE.md and REDESIGN_PLAN.md**

1. In `docs/REDESIGN_PLAN.md`:
   - Mark R16, R17, R18, R19, R20 as completed `[x]`.
2. In `docs/PROJECT_STATE.md`:
   - Update Active Milestone to M06 — Results & Retry ([REDESIGN_PLAN.md](REDESIGN_PLAN.md)).
   - Update Next Task to R21–R24.
   - Record completed M05 milestone.

- [ ] **Step 5: Commit documentation and release gate**

```bash
git add docs/PROJECT_STATE.md docs/REDESIGN_PLAN.md
git commit -m "docs: record completion of Milestone M05 Call Simulation Workspace"
```
