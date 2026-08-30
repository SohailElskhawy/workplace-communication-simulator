# Frontend Architecture, Modularity & Best Practices Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `@kalemny/web` frontend application to eliminate massive monolithic files, enforce SOLID/DRY/KISS principles, fix accessibility and focus trapping defects, resolve CSS theme inconsistencies, and modularize the codebase into maintainable, production-grade components.

**Architecture:** Decompose God components (`results/[attemptId]`, `simulations/[attemptId]`, `history`, `scenarios`) into focused, single-responsibility presentational and container components located under `src/components/`. Extract a unified `useApiQuery` data fetching hook to eliminate repetitive boilerplate. Fix UI theme tokens, accessibility landmarks, and focus management.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Clerk Auth, Sentry, Vitest.

## Global Constraints

- Monorepo: `pnpm` / `npm` workspaces
- DO NOT WORK WITH TDD (Implement features/refactors directly and write/maintain tests alongside behavior)
- Never change external API contracts or break existing backend integration
- Strictly maintain English-only Release 1 scope
- Validate all changes with `npm run typecheck`, `npm run lint`, and unit tests

---

### Task 1: CSS Theme Tokens, Foundation Primitives & Accessibility Core

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/components/ui/glass-card.tsx`
- Modify: `apps/web/src/components/accessible-dialog.tsx`
- Modify: `apps/web/src/components/route-state.tsx`
- Modify: `apps/web/src/app/error.tsx`
- Modify: `apps/web/src/app/global-error.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/lib/constants.ts`

**Interfaces:**
- Produces:
  - `--max-w-container-max: 80rem;` and `--container-max: 80rem;` in `globals.css`
  - `UNIVERSAL_SKILL_KEYS = ["clarity", "assertiveness", "empathy", "structure", "conciseness"] as const` in `constants.ts`
  - Polymorphic `GlassCard` accepting `as?: "div" | "section" | "article"`
  - Stabilized `AccessibleDialog` with memoized focus trapping

- [ ] **Step 1: Update `globals.css` with container-max tokens**
Add `--container-max: 80rem;` to `:root` and `@theme inline` in `apps/web/src/app/globals.css` so that `max-w-container-max` resolves to `80rem` (`1280px`).

- [ ] **Step 2: Create `src/lib/constants.ts` for centralized domain constants**
Define and export `UNIVERSAL_SKILL_KEYS` and common category mappings in `apps/web/src/lib/constants.ts`.

- [ ] **Step 3: Refactor `GlassCard` for polymorphic semantic HTML**
Update `apps/web/src/components/ui/glass-card.tsx` to default to rendering a `<div>` unless explicitly given `as="section"` or `as="article"`, preventing improper document landmark outlines.

- [ ] **Step 4: Fix Focus Jitter in `AccessibleDialog`**
Refactor `apps/web/src/components/accessible-dialog.tsx` to use `useRef` to store the latest `onClose` callback and eliminate unstable re-triggering of the focus trap on parent re-renders.

- [ ] **Step 5: Modernize `route-state.tsx` and Root Error Boundaries**
Update `route-state.tsx`, `src/app/error.tsx`, and `src/app/global-error.tsx` to use project design tokens (`bg-primary`, `font-display`, `border-border`, `brutalist-interactive`) instead of hardcoded indigo/slate classes.

- [ ] **Step 6: Add "Skip to main content" link in `RootLayout`**
Add an accessible skip link `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` in `src/app/layout.tsx`.

- [ ] **Step 7: Verify Typecheck & Lint**
Run: `npm --prefix apps/web run typecheck && npm --prefix apps/web run lint`
Expected: PASS

---

### Task 2: Unified Data-Fetching Hook & Hook Refinements

**Files:**
- Create: `apps/web/src/hooks/use-api-query.ts`
- Modify: `apps/web/src/hooks/use-voice-recorder.ts`
- Modify: `apps/web/src/components/speech-button.tsx`
- Modify: `apps/web/src/hooks/use-voice-recorder.test.ts`

**Interfaces:**
- Produces:
  - `useApiQuery<T>(queryFn: (client: ApiClient, token: string) => Promise<T>, options?: { enabled?: boolean; deps?: any[] })`
  - Optimized `useVoiceRecorder` with stabilized interval and ref callbacks

- [ ] **Step 1: Implement `useApiQuery` custom hook**
Create `apps/web/src/hooks/use-api-query.ts` to manage `isLoaded`, `isSignedIn`, `getToken`, API client creation, loading, data, error, and refetching states cleanly without boilerplate in every page.

- [ ] **Step 2: Optimize `useVoiceRecorder` hook**
Refactor `apps/web/src/hooks/use-voice-recorder.ts`:
- Store callbacks in refs to eliminate stale closures in `setInterval`.
- Check browser support safely without SSR mismatch.

- [ ] **Step 3: Harden `SpeechButton` against unmount leaks**
In `apps/web/src/components/speech-button.tsx`, add an unmount guard (`isMountedRef`) before setting playing/error state.

- [ ] **Step 4: Verify Tests & Typecheck**
Run: `npm --prefix apps/web run typecheck`
Expected: PASS

---

### Task 3: Decompose `ResultsPage` (1,662 Lines) into Modular Architecture

**Files:**
- Create: `apps/web/src/components/results/evaluation-processing-view.tsx`
- Create: `apps/web/src/components/results/evaluation-failure-view.tsx`
- Create: `apps/web/src/components/results/attempt-comparison-section.tsx`
- Create: `apps/web/src/components/results/coaching-moments-section.tsx`
- Create: `apps/web/src/components/results/objectives-outcome-section.tsx`
- Create: `apps/web/src/components/results/transcript-viewer-modal.tsx`
- Create: `apps/web/src/components/results/delete-attempt-dialog.tsx`
- Modify: `apps/web/src/app/app/results/[attemptId]/page.tsx`

**Interfaces:**
- Produces:
  - Focused, single-responsibility sub-components under `src/components/results/`
  - Streamlined `ResultsPage` orchestrator (< 200 lines)

- [ ] **Step 1: Extract `EvaluationProcessingView`**
Move the animated evaluation loading view from `results/[attemptId]/page.tsx` to `src/components/results/evaluation-processing-view.tsx`.

- [ ] **Step 2: Extract `EvaluationFailureView`**
Move the recoverable failure card to `src/components/results/evaluation-failure-view.tsx`.

- [ ] **Step 3: Extract `AttemptComparisonSection`**
Move the retry attempt delta comparison tables and weak area cards to `src/components/results/attempt-comparison-section.tsx`.

- [ ] **Step 4: Extract `CoachingMomentsSection` & `ObjectivesOutcomeSection`**
Extract the coaching moments cards ("Moments That Mattered") and scenario objectives breakdown into dedicated components.

- [ ] **Step 5: Extract `DeleteAttemptDialog` & `TranscriptViewer`**
Create reusable `DeleteAttemptDialog` and `TranscriptViewer` components.

- [ ] **Step 6: Refactor `src/app/app/results/[attemptId]/page.tsx`**
Rewrite `ResultsPage` to import and orchestrate the clean sub-components, reducing line count from 1,662 to under 200 lines.

- [ ] **Step 7: Verify Typecheck & Lint**
Run: `npm --prefix apps/web run typecheck && npm --prefix apps/web run lint`
Expected: PASS

---

### Task 4: Decompose `SimulationPage` (1,060 Lines) into Modular Architecture

**Files:**
- Create: `apps/web/src/components/simulations/simulation-header.tsx`
- Create: `apps/web/src/components/simulations/briefing-sidebar.tsx`
- Create: `apps/web/src/components/simulations/conversation-stream.tsx`
- Create: `apps/web/src/components/simulations/simulation-composer.tsx`
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.tsx`

**Interfaces:**
- Produces:
  - `SimulationHeader`: Top navigation, scenario title, difficulty, timer, and finish simulation trigger.
  - `BriefingSidebar`: Desktop sidebar and mobile accordion for scenario briefing and session stats.
  - `ConversationStream`: Renders learner and counterpart turns, optimistic pending turn, and retry error bubbles.
  - `SimulationComposer`: Textarea, character limit counter, and send button.
  - Streamlined `SimulationPage` (< 200 lines).

- [ ] **Step 1: Extract `SimulationHeader`**
Move top bar logic, elapsed timer display, and finish modal triggers into `src/components/simulations/simulation-header.tsx`.

- [ ] **Step 2: Extract `BriefingSidebar`**
Move desktop sidebar and mobile collapsible briefing into `src/components/simulations/briefing-sidebar.tsx`.

- [ ] **Step 3: Extract `ConversationStream`**
Move message bubbles, counterpart response states, and failed turn retries into `src/components/simulations/conversation-stream.tsx`.

- [ ] **Step 4: Extract `SimulationComposer`**
Move sticky bottom input form, keyboard shortcuts (Enter to send, Shift+Enter for newline), and character count into `src/components/simulations/simulation-composer.tsx`.

- [ ] **Step 5: Refactor `src/app/app/simulations/[attemptId]/page.tsx`**
Rewrite `SimulationPage` to coordinate state between composer, stream, header, and sidebar, reducing line count from 1,060 to under 200 lines.

- [ ] **Step 6: Verify Typecheck & Lint**
Run: `npm --prefix apps/web run typecheck && npm --prefix apps/web run lint`
Expected: PASS

---

### Task 5: Refactor & Modularize History, Progress, and Scenario Detail Pages

**Files:**
- Create: `apps/web/src/components/history/history-item-card.tsx`
- Modify: `apps/web/src/app/app/history/page.tsx`
- Modify: `apps/web/src/app/app/progress/page.tsx`
- Modify: `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx`
- Modify: `apps/web/src/app/app/scenarios/page.tsx`

**Interfaces:**
- Produces:
  - Accessible history search input and filter `<select>` elements with explicit `aria-label`.
  - Reuse `DeleteAttemptDialog` in history page.
  - Decompose scenario detail briefing view.

- [ ] **Step 1: Refactor `history/page.tsx` & Extract `HistoryItemCard`**
Extract `HistoryItemCard` into `src/components/history/history-item-card.tsx`, add `aria-label` to search input and filter dropdowns, and reuse `DeleteAttemptDialog`.

- [ ] **Step 2: Clean up `progress/page.tsx`**
Modularize the 5-skill grid and next-focus banner in `apps/web/src/app/app/progress/page.tsx`.

- [ ] **Step 3: Clean up `scenarios/[scenarioKey]/page.tsx`**
Decompose briefing section and difficulty selectors into cleaner modular components.

- [ ] **Step 4: Verify Typecheck & Lint**
Run: `npm --prefix apps/web run typecheck && npm --prefix apps/web run lint`
Expected: PASS

---

### Task 6: Comprehensive End-to-End Quality Gates & Verification

**Files:**
- Touch: All modified files in `apps/web/src`

- [ ] **Step 1: Run Full Workspace Typecheck**
Run: `npm --prefix apps/web run typecheck`
Expected: 0 errors

- [ ] **Step 2: Run Full Workspace Linter**
Run: `npm --prefix apps/web run lint`
Expected: 0 warnings, 0 errors

- [ ] **Step 3: Run Vitest Unit Tests**
Run: `npm test` or `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Verify Component Boundaries & File Sizing**
Verify that all refactored files are under 300 lines with clean single responsibility.
