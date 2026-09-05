# Push-to-Talk: Enter-to-Send & Auto-Send Workflow Design

- **Date:** 2026-09-05
- **Status:** Approved
- **Scope:** Frontend (`apps/web/src/components/simulations/simulation-composer.tsx` and related simulation page handlers)

---

## 1. Problem Statement & Motivation

In the workplace conversation simulation, push-to-talk allows users to hold <kbd>Space</kbd> to record their response. However, when speech ends and Whisper finishes transcription:
1. The user must currently take their hands off the keyboard and reach for the mouse to click the "Send" button.
2. The review `<textarea>` fails to receive automatic keyboard focus because `textareaRef.current?.focus()` runs synchronously before React re-renders the element into the DOM.
3. There is no global <kbd>Enter</kbd> handler to submit the draft from anywhere on the page.
4. For users who prefer a completely fluent conversational rhythm, there is no option to auto-send the transcript immediately upon releasing the push-to-talk key.

---

## 2. Solution Overview

We introduce two coordinated improvements:
1. **Keyboard-First Review & Send:**
   - Reliable auto-focus on the review textarea when a voice transcript arrives.
   - Pressing <kbd>Enter</kbd> (without <kbd>Shift</kbd>) in the textarea or globally on the page immediately sends the response.
   - <kbd>Shift</kbd>+<kbd>Enter</kbd> preserves newline insertion for editing.
   - Clear visual indicators (`Send ↵ Enter`) on desktop, gracefully responsive on mobile.
2. **Review vs. Auto-Send Toggle:**
   - A compact, accessible toggle switch ("Review before sending") persisted in `localStorage`.
   - When enabled (default): Whisper transcript appears in the review composer; user reviews and presses <kbd>Enter</kbd> or clicks "Send".
   - When disabled: Releasing <kbd>Space</kbd> (or clicking "Done Speaking" on mobile) transcribes and immediately submits the turn to the AI.

---

## 3. Detailed Specifications

### 3.1 Preference Persistence & State
- **Storage Key:** `kalemny_voice_review_before_send`
- **Default:** `true` (Review enabled by default)
- **Lifecycle:**
  - Initialized within a client-side `useEffect` to avoid SSR/hydration mismatch in Next.js.
  - Toggling updates React state and writes to `localStorage`.

### 3.2 Review Mode Interaction
- **Mount & Auto-Focus:**
  - A reactive `useEffect` watches `hasVoiceDraft`: when `true` and the `<textarea>` mounts, focus is set with the cursor at the end of the text.
- **Keydown Handling:**
  - In `<textarea>`: `onKeyDown` intercepts `Enter` (without `Shift`), prevents default newline, and invokes `onSendTurn()`.
  - Window listener: An active listener triggers `onSendTurn()` if `hasVoiceDraft === true`, the draft has content, no modals/dialogs are open, and the key is `Enter` without `Shift`.
- **UI Enhancements:**
  - The "Send" button displays a keyboard hint badge on screens $\ge$ `sm` (e.g. `Send` + `<kbd>↵</kbd>`).
  - Mobile screens keep the button compact without clutter.

### 3.3 Auto-Send Mode Interaction
- **Execution Flow:**
  - When `reviewBeforeSend === false`, the voice recorder's `onTranscriptReady(transcript)` callback does NOT set `hasVoiceDraft = true`.
  - Instead, it directly triggers `onSendTurn(transcript, "VOICE")`.
  - The status banner indicates transcription and sending seamlessly.
  - If transcript is empty or fails, it cancels without sending an empty turn and returns to idle.

### 3.4 Mobile & Responsive Accommodations
- The toggle is designed with a minimal footprint (`text-[10px] sm:text-xs`) and touch-friendly hit areas ($\ge$ 44px).
- Instructions dynamically adjust:
  - Desktop: *"Hold <kbd>Space</kbd> to talk, or tap the microphone."*
  - Mobile: *"Tap to talk, tap Done to send."*
- Keyboard shortcut tags (<kbd>Space</kbd>, <kbd>↵</kbd>) are hidden or styled unobtrusively on small screens.

---

## 4. Error & Edge Case Handling

1. **Empty / Inaudible Voice Input:**
   - If Whisper returns whitespace or empty text, auto-send does nothing and recording resets to idle without error.
2. **Shift + Enter:**
   - Explicitly allowed for multiline editing in the review textarea; never triggers send.
3. **Open Modals:**
   - Global <kbd>Enter</kbd> is suppressed if an active dialog (e.g., "Finish Rehearsal" or "Briefing") is open.
4. **Composer Disabled / Busy:**
   - <kbd>Enter</kbd> is ignored if `isComposerDisabled`, `sendingTurn`, or `isVoiceBusy` is active.

---

## 5. Testing & Verification Plan

1. **Unit / Integration Testing:**
   - Test `SimulationComposer` keyboard events:
     - <kbd>Enter</kbd> submits the turn when text is present.
     - <kbd>Shift</kbd>+<kbd>Enter</kbd> inserts a newline.
     - Global <kbd>Enter</kbd> submits when voice draft is ready.
   - Test toggle state changes and localStorage persistence.
2. **Responsive Verification:**
   - Verify layout on narrow mobile viewports ($\le$ 375px) and desktop viewports ($\ge$ 1024px).
3. **End-to-End Voice Flow:**
   - Hold Space $\to$ speak $\to$ release Space $\to$ verify auto-focus $\to$ press Enter $\to$ turn sends.
   - Toggle Auto-send on $\to$ hold Space $\to$ speak $\to$ release Space $\to$ turn sends immediately.
