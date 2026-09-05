# Push-to-Talk: Enter-to-Send & Auto-Send Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless keyboard-first message sending (<kbd>Enter</kbd> to send) and an optional auto-send toggle in push-to-talk simulation mode, optimized for both desktop and mobile.

**Architecture:** Update `SimulationComposer` to persist the user's "Review before sending" preference in `localStorage`, manage textarea auto-focus upon transcription receipt, attach a global <kbd>Enter</kbd> listener when a voice draft is pending, and bypass review if auto-send is enabled. The Send button and layout adapt responsively across screen sizes.

**Tech Stack:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Monorepo: `apps/web`
- DO NOT use TDD (per project rules in `AGENTS.md`).
- Strict TypeScript; zero `any`.
- Must preserve existing push-to-talk and text conversation capabilities.
- Audio blobs and mic data are ephemeral (invariant 13).
- Responsive on mobile ($\le 375px$) and desktop ($\ge 1024px$).

---

### Task 1: Update SimulationComposer with Review Preference, Enter Handlers, and Responsive UI

**Files:**
- Modify: `apps/web/src/components/simulations/simulation-composer.tsx`
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.tsx`

**Interfaces:**
- Consumes: `onSendTurn: (overrideText?: string, overrideInputMethod?: InputMethod) => void`
- Produces: Persistent `reviewBeforeSend` toggle in composer, automatic focus on mount, window <kbd>Enter</kbd> key handling, and immediate dispatch when `reviewBeforeSend === false`.

- [ ] **Step 1: Update `SimulationComposerProps` in `simulation-composer.tsx`**

Allow `onSendTurn` to accept optional `(overrideText?: string, overrideInputMethod?: InputMethod) => void` so auto-send can deliver the newly transcribed text directly.

- [ ] **Step 2: Add `reviewBeforeSend` state and localStorage persistence**

Initialize `reviewBeforeSend` state (defaulting to `true`) and load safely inside `useEffect` from `localStorage.getItem("kalemny_voice_review_before_send")`. Add a callback to update state and store the new value.

- [ ] **Step 3: Implement immediate auto-send in `useVoiceRecorder.onTranscriptReady`**

If `reviewBeforeSend` is false:
- If `trimmed` is non-empty: call `onSendTurn(trimmed, "VOICE")` immediately.
If `reviewBeforeSend` is true:
- Set `hasVoiceDraft` via `onVoiceTranscriptReady()`, update composer text, and prepare for review.

- [ ] **Step 4: Implement textarea auto-focus effect**

When `hasVoiceDraft` becomes `true` and the `<textarea>` mounts, use a reactive `useEffect` to focus `textareaRef.current` and position the cursor at the end:
```typescript
useEffect(() => {
  if (hasVoiceDraft && textareaRef.current) {
    textareaRef.current.focus();
    const len = textareaRef.current.value.length;
    textareaRef.current.setSelectionRange(len, len);
  }
}, [hasVoiceDraft]);
```

- [ ] **Step 5: Implement global <kbd>Enter</kbd> key listener**

In `simulation-composer.tsx`, add a window `keydown` listener active when `hasVoiceDraft === true` and `!isComposerDisabled && !isVoiceBusy`:
- If `event.key === "Enter"` and `!event.shiftKey` and `!event.isComposing`:
  - Check if target is inside an open modal or if any dialog is open (`document.querySelector('[role="dialog"]')`). If so, ignore.
  - Otherwise, prevent default and invoke `onSendTurn()`.

- [ ] **Step 6: Update Composer UI & Mobile-Friendly Controls**

- Add the accessible "Review before sending" toggle switch in the voice header bar:
  - Responsive text: `text-[11px] sm:text-xs text-muted-foreground`.
  - Proper touch target ($\ge 44px$) with accessible switch or toggle button.
- In review mode:
  - Add `<kbd className="hidden sm:inline-block ml-1 rounded bg-surface-subtle px-1 py-0.5 text-[9px] font-mono text-foreground border border-border">↵</kbd>` to the Send button.
  - Update helper text:
    - Review mode: Desktop shows *"Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline."*
    - Mobile shows *"Review or edit before sending."*
  - Auto-send mode: Desktop shows *"Hold <kbd>Space</kbd> to talk, release to send."* Mobile shows *"Tap to talk, tap Done to send."*

- [ ] **Step 7: Update `page.tsx` to pass through `handleSendTurn` arguments**

Ensure `onSendTurn={(text, method) => void handleSendTurn(text, method)}` in `apps/web/src/app/app/simulations/[attemptId]/page.tsx` correctly propagates the overrides.

---

### Task 2: Unit Testing & Verification

**Files:**
- Create: `apps/web/src/components/simulations/simulation-composer.test.tsx` (or unit test for composer keyboard & auto-send logic)

- [ ] **Step 1: Write tests for voice send logic & keyboard shortcuts**

Verify:
- Enter triggers send when text is present and shiftKey is false.
- Shift+Enter does not trigger send.
- Toggle updates persistence and state.

- [ ] **Step 2: Run test suite and type check**

Run:
```bash
pnpm --filter @kalemny/web test
pnpm --filter @kalemny/web typecheck
```
Verify: all tests pass and TypeScript compiles cleanly.

- [ ] **Step 3: Commit changes**

```bash
git add apps/web/src/components/simulations/simulation-composer.tsx apps/web/src/app/app/simulations/[attemptId]/page.tsx
git commit -m "feat: add enter to send and auto-send toggle for push to talk mode"
```
