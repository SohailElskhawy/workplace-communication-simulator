# Milestone M04: Discovery & Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Kalemny discovery and setup flow (`/app` Practice Selection Hub, Scenario Briefing Modal, and CV/JD Custom Interview Wizard) in alignment with the Warm Coral design specifications and weekly testing entitlements.

**Architecture:** `/app` serves as the primary post-login practice selection hub containing the weekly entitlement banner, custom interview hero banner, 6 curated scenario cards with bundled static portraits, and a dedicated custom interviews section. An in-place `ScenarioBriefingModal` is controlled declaratively via the URL query param `?scenario=[scenarioKey]`, supporting unified Warm Coral selectors for difficulty, language/dialect, and practice mode. The CV/JD wizard on `/app/scenarios/custom` is refactored to eliminate legacy brutalist styling and reuses the same practice configuration selectors.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui primitives, Clerk Auth, `@kalemny/contracts`, Vitest, React Testing Library.

## Global Constraints

- **Light mode only**: `color-scheme: light`. No dark theme.
- **No neo-brutalism**: Zero hard black borders, zero offset black drop-shadows (e.g. `shadow-[...#000]`), zero comic-strip styling.
- **No blue/purple gradients**: Eliminate legacy electric blue (`#0052ff`) and purple gradients.
- **Bilingual Parity**: Complete Modern Standard Arabic (MSA) and English (EN) parity using `useLocale()`.
- **Arabic Typography**: Arabic text must strictly maintain `tracking-normal` (zero letter spacing).
- **Interactive Targets**: All interactive elements (buttons, pills, inputs, triggers) must meet a minimum `44px × 44px` touch target (`min-h-[44px]`).
- **Logical CSS Properties**: Use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. Directional icons mirrored in RTL via `.directional-icon`. Non-directional visuals never mirrored.
- **Testing Policy**: Free testing access with 3 simulation starts per rolling 7 days across all scenarios. Generating custom scenarios is 100% free and does not deduct quota.
- **No TDD Rule**: Do not work with strict TDD failure loops. Write implementation and critical tests alongside each deliverable.

---

## File Structure

```
apps/web/src/
  ├── components/
  │     ├── accessible-dialog.tsx                        (Modify: add maxWidth prop/class support)
  │     └── scenarios/
  │           ├── testing-entitlement-card.tsx           (Create: weekly quota banner component)
  │           ├── testing-entitlement-card.test.tsx      (Create: tests for entitlement card)
  │           ├── scenario-card.tsx                      (Create: Warm Coral curated scenario card)
  │           ├── scenario-card.test.tsx                 (Create: tests for scenario card)
  │           ├── curated-scenario-grid.tsx              (Create: 6-scenario responsive grid)
  │           ├── difficulty-selector.tsx                (Modify: Warm Coral styling & Arabic translations)
  │           ├── difficulty-selector.test.tsx           (Modify: tests for difficulty selector)
  │           ├── language-dialect-selector.tsx          (Modify: Warm Coral styling touchups)
  │           ├── scenario-briefing-modal.tsx            (Create: in-place briefing dialog)
  │           ├── scenario-briefing-modal.test.tsx       (Create: tests for briefing modal)
  │           ├── custom-interview-wizard.tsx            (Modify: Warm Coral tokens, remove brutalist styling)
  │           └── custom-interview-wizard.test.tsx       (Modify: tests for custom interview wizard)
  └── app/app/
        ├── page.tsx                                     (Modify: dedicated Practice Selection Hub)
        ├── page.test.tsx                                (Create: tests for /app practice hub)
        └── scenarios/[scenarioKey]/page.tsx             (Modify: redirect to /app?scenario=:scenarioKey)
```

---

### Task 1: AccessibleDialog MaxWidth & TestingEntitlementCard Component

**Files:**
- Modify: `apps/web/src/components/accessible-dialog.tsx:85-88`
- Create: `apps/web/src/components/scenarios/testing-entitlement-card.tsx`
- Create: `apps/web/src/components/scenarios/testing-entitlement-card.test.tsx`

**Interfaces:**
- Consumes: `@/lib/locale-context` (`useLocale`), `@/components/icons` (`SparklesIcon`, `AlertTriangleIcon`), `@kalemny/contracts` (`EntitlementStatusResponse`).
- Produces: `TestingEntitlementCard` component with props `{ remaining: number; limit: number; resetWindowDays: number; loading?: boolean }`.

- [ ] **Step 1: Update AccessibleDialog to support flexible maxWidth**

In `apps/web/src/components/accessible-dialog.tsx`, add optional `maxWidthClass?: string` to `AccessibleDialogProps` (defaulting to `"max-w-md"`). Apply `maxWidthClass` to the dialog container class list so modals like `ScenarioBriefingModal` can render with `max-w-3xl`.

- [ ] **Step 2: Implement TestingEntitlementCard**

Create `apps/web/src/components/scenarios/testing-entitlement-card.tsx`:
```tsx
"use client";

import { AlertTriangleIcon, SparklesIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface TestingEntitlementCardProps {
  remaining: number;
  limit: number;
  resetWindowDays?: number;
  loading?: boolean;
}

export function TestingEntitlementCard({
  remaining,
  limit,
  resetWindowDays = 7,
  loading = false,
}: TestingEntitlementCardProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";
  const isExhausted = remaining <= 0;

  if (loading) {
    return (
      <div
        role="status"
        aria-label={isArabic ? "جارٍ تحميل الرصيد..." : "Loading practice balance..."}
        className="animate-pulse rounded-card border border-border-subtle bg-surface-solid p-5 sm:p-6"
      >
        <div className="h-4 w-32 rounded bg-surface-subtle" />
        <div className="mt-2 h-6 w-56 rounded bg-surface-subtle" />
      </div>
    );
  }

  return (
    <section
      aria-label={isArabic ? "رصيد التجربة الأسبوعي" : "Weekly testing practice quota"}
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-card border p-5 sm:p-6 transition-colors shadow-xs",
        isExhausted
          ? "border-alert/30 bg-alert-surface text-alert-foreground"
          : "border-border-subtle bg-surface-solid text-foreground"
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isExhausted
              ? "bg-alert/10 text-alert"
              : "bg-primary-muted text-primary"
          )}
        >
          {isExhausted ? (
            <AlertTriangleIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isArabic ? "وصول مجاني للتجربة" : "Free Testing Access"}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                isExhausted
                  ? "bg-alert/15 text-alert"
                  : "bg-primary-muted text-primary"
              )}
            >
              {isArabic
                ? `متبقي ${remaining} من ${limit}`
                : `${remaining} of ${limit} remaining`}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {isExhausted
              ? isArabic
                ? `لقد استخدمت جميع الجلسات المتاحة لهذا الأسبوع. يتجدد الرصيد تلقائياً كل ${resetWindowDays} أيام.`
                : `You have used all ${limit} sessions for this period. Practice quota resets automatically every ${resetWindowDays} days.`
              : isArabic
                ? `لديك ${remaining} من أصل ${limit} جلسات محاكاة مجانية هذا الأسبوع. تتجدد الجلسات تلقائياً كل ${resetWindowDays} أيام.`
                : `You have ${remaining} of ${limit} free simulation sessions available. Sessions reset automatically on a rolling ${resetWindowDays}-day window.`}
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write tests for TestingEntitlementCard**

Create `apps/web/src/components/scenarios/testing-entitlement-card.test.tsx` verifying:
1. Renders loading placeholder when `loading={true}`.
2. Renders correct remaining balance (`2 of 3 remaining` in English and Arabic).
3. Renders alert state when `remaining={0}`.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter web test apps/web/src/components/scenarios/testing-entitlement-card.test.tsx`  
Commit:
```bash
git add apps/web/src/components/accessible-dialog.tsx apps/web/src/components/scenarios/testing-entitlement-card.tsx apps/web/src/components/scenarios/testing-entitlement-card.test.tsx
git commit -m "feat(web): add TestingEntitlementCard and update AccessibleDialog maxWidth"
```

---

### Task 2: Warm Coral Scenario Card & Curated Grid Component

**Files:**
- Create: `apps/web/src/components/scenarios/scenario-card.tsx`
- Create: `apps/web/src/components/scenarios/scenario-card.test.tsx`
- Create: `apps/web/src/components/scenarios/curated-scenario-grid.tsx`

**Interfaces:**
- Consumes: `@kalemny/contracts` (`PublicScenarioSummary`), `lib/scenario-images` (`getScenarioImage`), `components/icons` (`PlayIcon`, `ArrowRightIcon`), `lib/locale-context` (`useLocale`).
- Produces: `ScenarioCard` component with props `{ scenario: PublicScenarioSummary; isRecommended?: boolean; onSelect: (key: string) => void; }`, and `CuratedScenarioGrid` with props `{ scenarios: PublicScenarioSummary[]; recommendedKey?: string; onSelectScenario: (key: string) => void; }`.

- [ ] **Step 1: Implement ScenarioCard**

Create `apps/web/src/components/scenarios/scenario-card.tsx`:
```tsx
"use client";

import type { PublicScenarioSummary } from "@kalemny/contracts";
import Image from "next/image";

import { ArrowRightIcon, PlayIcon, SparklesIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";
import { getScenarioImage } from "@/lib/scenario-images";

export interface ScenarioCardProps {
  scenario: PublicScenarioSummary;
  isRecommended?: boolean;
  onSelect: (scenarioKey: string) => void;
}

export function ScenarioCard({
  scenario,
  isRecommended = false,
  onSelect,
}: ScenarioCardProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  const portrait = getScenarioImage(scenario.key);
  const title = isArabic && scenario.titleAr ? scenario.titleAr : scenario.title;
  const summary = isArabic && scenario.summaryAr ? scenario.summaryAr : scenario.summary;

  return (
    <article
      data-od-id={`scenario-card-${scenario.key}`}
      className={cn(
        "group flex min-h-[300px] flex-col justify-between rounded-card border bg-surface-solid p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised",
        isRecommended
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border-subtle hover:border-border"
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {portrait && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border-subtle shadow-2xs">
                <Image
                  src={portrait}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            )}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {scenario.category}
              </span>
              {isRecommended && (
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                  <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isArabic ? "مقترح لك" : "Recommended"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-display text-xl font-semibold text-foreground transition-colors group-hover:text-primary sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelect(scenario.key)}
        className="mt-6 flex min-h-[44px] w-full items-center justify-between border-t border-border-subtle pt-4 text-sm font-semibold text-foreground transition-colors group-hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-control"
      >
        <span className="inline-flex items-center gap-2">
          <PlayIcon className="h-4 w-4" aria-hidden="true" />
          <span>{isArabic ? "تفاصيل التدرّب" : "View practice setup"}</span>
        </span>
        <ArrowRightIcon className="directional-icon h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </article>
  );
}
```

- [ ] **Step 2: Implement CuratedScenarioGrid**

Create `apps/web/src/components/scenarios/curated-scenario-grid.tsx`:
```tsx
"use client";

import type { PublicScenarioSummary } from "@kalemny/contracts";

import { useLocale } from "@/lib/locale-context";
import { ScenarioCard } from "./scenario-card";

export interface CuratedScenarioGridProps {
  scenarios: PublicScenarioSummary[];
  recommendedKey?: string;
  onSelectScenario: (key: string) => void;
}

export function CuratedScenarioGrid({
  scenarios,
  recommendedKey,
  onSelectScenario,
}: CuratedScenarioGridProps) {
  const { locale } = useLocale();
  const isArabic = locale === "ar";

  return (
    <section aria-labelledby="curated-scenarios-heading" className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2
            id="curated-scenarios-heading"
            className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {isArabic ? "سيناريوهات التدرّب" : "Practice Scenarios"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isArabic
              ? "مواقف مهنية مدروسة مع محاور ذكي لتعزيز مهاراتك التواصلية"
              : "Curated workplace simulations designed for deliberate deliberate communication practice"}
          </p>
        </div>
        <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-muted-foreground">
          {scenarios.length} {isArabic ? "سيناريو" : "scenarios"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.key}
            scenario={scenario}
            isRecommended={scenario.key === recommendedKey}
            onSelect={onSelectScenario}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write tests for ScenarioCard**

Create `apps/web/src/components/scenarios/scenario-card.test.tsx` verifying:
1. Renders scenario title, summary, and category correctly.
2. Renders recommended badge when `isRecommended={true}`.
3. Fires `onSelect` with `scenario.key` when the action button is clicked.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter web test apps/web/src/components/scenarios/scenario-card.test.tsx`  
Commit:
```bash
git add apps/web/src/components/scenarios/scenario-card.tsx apps/web/src/components/scenarios/curated-scenario-grid.tsx apps/web/src/components/scenarios/scenario-card.test.tsx
git commit -m "feat(web): implement Warm Coral ScenarioCard and CuratedScenarioGrid"
```

---

### Task 3: Practice Selectors Bilingual & Warm Coral Refresh

**Files:**
- Modify: `apps/web/src/components/scenarios/difficulty-selector.tsx`
- Modify: `apps/web/src/components/scenarios/difficulty-selector.test.tsx`
- Modify: `apps/web/src/components/scenarios/language-dialect-selector.tsx`

**Interfaces:**
- Consumes: `@kalemny/contracts` (`Difficulty`, `ArabicDialect`, `SupportedLanguage`), `@/lib/locale-context` (`useLocale`).
- Produces: Updated `DifficultySelector` and `LanguageDialectSelector` adhering to Warm Coral tokens, 44px touch targets, and full Arabic translations.

- [ ] **Step 1: Update DifficultySelector with Warm Coral tokens & Arabic copy**

In `apps/web/src/components/scenarios/difficulty-selector.tsx`:
1. Add `titleAr` and `descriptionAr` to `DIFFICULTY_OPTIONS`:
   - `EASY`: titleAr: "أساسي", descriptionAr: "محاور داعم يتقبل الأفكار المنطقية مع أقل قدر من الاعتراضات."
   - `MEDIUM`: titleAr: "متوسط", descriptionAr: "اعتراضات مهنية واقعية تتحدى الطروحات غير المدعومة بأدلة."
   - `HARD`: titleAr: "متقدم", descriptionAr: "محاور حذر ومشكك يختبر قوة حجتك وحدودك المهنية بصرامة."
2. Replace brutalist styling (`border-border shadow-[...]`) with Warm Coral tokens:
   - Inactive: `border-border-subtle bg-surface-solid text-foreground hover:border-border`
   - Active: `border-primary bg-selected-surface text-primary shadow-xs ring-1 ring-primary/30`
3. Enforce `min-h-[44px]` on each option button.
4. Support Arabic localization via `useLocale()`.

- [ ] **Step 2: Update LanguageDialectSelector styling**

In `apps/web/src/components/scenarios/language-dialect-selector.tsx`:
1. Ensure all option buttons have `min-h-[44px]` and use `border-border-subtle bg-surface-solid` / active `border-primary bg-selected-surface`.
2. Remove any remaining harsh borders or brutalist classes.

- [ ] **Step 3: Update and run DifficultySelector tests**

In `apps/web/src/components/scenarios/difficulty-selector.test.tsx`, verify selection behavior and bilingual rendering.  
Run: `pnpm --filter web test apps/web/src/components/scenarios/difficulty-selector.test.tsx`  
Commit:
```bash
git add apps/web/src/components/scenarios/difficulty-selector.tsx apps/web/src/components/scenarios/difficulty-selector.test.tsx apps/web/src/components/scenarios/language-dialect-selector.tsx
git commit -m "refactor(web): update DifficultySelector and LanguageDialectSelector to Warm Coral tokens and bilingual parity"
```

---

### Task 4: Scenario Briefing Modal Component

**Files:**
- Create: `apps/web/src/components/scenarios/scenario-briefing-modal.tsx`
- Create: `apps/web/src/components/scenarios/scenario-briefing-modal.test.tsx`

**Interfaces:**
- Consumes: `AccessibleDialog`, `PublicScenarioDetail`, `DifficultySelector`, `LanguageDialectSelector`, `PracticeModeSelector`, `getScenarioImage`, `useLocale`.
- Produces: `ScenarioBriefingModal` component with props:
  ```ts
  export interface ScenarioBriefingModalProps {
    open: boolean;
    scenario: PublicScenarioDetail | null;
    loading?: boolean;
    error?: string | null;
    remainingQuota: number;
    onClose: () => void;
    onStartPractice: (config: {
      difficulty: Difficulty;
      language: SupportedLanguage;
      dialect?: ArabicDialect;
      interactionMode: InteractionMode;
    }) => Promise<void>;
  }
  ```

- [ ] **Step 1: Implement ScenarioBriefingModal**

Create `apps/web/src/components/scenarios/scenario-briefing-modal.tsx`:
- Render within `AccessibleDialog` with `maxWidthClass="max-w-3xl"`.
- Counterpart header: static portrait thumbnail (48×48px), scenario title, counterpart role.
- Situation, Your Role vs. Counterpart Role, and Primary Objective cards styled with Warm Coral borders and surfaces.
- Integrated controls: `DifficultySelector`, `LanguageDialectSelector`, and `PracticeModeSelector`.
- Quota notification: *"Starting this session consumes 1 of your weekly practice starts."*
- Action buttons:
  - *"Start Practice / ابدأ التدرّب"* (`bg-primary text-primary-foreground min-h-[44px]`). Disabled when `remainingQuota <= 0` or during `starting` state.
  - *"Cancel / إلغاء"* (`border border-border min-h-[44px]`).

- [ ] **Step 2: Write tests for ScenarioBriefingModal**

Create `apps/web/src/components/scenarios/scenario-briefing-modal.test.tsx` verifying:
1. Renders scenario context (situation, role, objectives) when `scenario` prop is loaded.
2. Updates difficulty, language, dialect, and practice mode upon user interaction.
3. Disables "Start Practice" button when `remainingQuota === 0` and renders quota exhausted text.
4. Invokes `onStartPractice` with selected configuration when primary button is clicked.
5. Invokes `onClose` when Cancel or Escape is pressed.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test apps/web/src/components/scenarios/scenario-briefing-modal.test.tsx`  
Commit:
```bash
git add apps/web/src/components/scenarios/scenario-briefing-modal.tsx apps/web/src/components/scenarios/scenario-briefing-modal.test.tsx
git commit -m "feat(web): implement ScenarioBriefingModal with Warm Coral configuration controls"
```

---

### Task 5: Redesign `/app` Practice Selection Hub & Legacy Route Redirect

**Files:**
- Modify: `apps/web/src/app/app/page.tsx`
- Create: `apps/web/src/app/app/page.test.tsx`
- Modify: `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx`

**Interfaces:**
- Consumes: `createApiClient`, Clerk `useAuth`/`useUser`, `TestingEntitlementCard`, `CuratedScenarioGrid`, `ScenarioBriefingModal`, `DeleteCustomScenarioDialog`, `useLocale`.
- Produces: Unified Practice Selection Hub on `/app` with URL query sync (`?scenario=:key`).

- [ ] **Step 1: Rewrite `/app/app/page.tsx` as dedicated Practice Hub**

Update `apps/web/src/app/app/page.tsx`:
1. Read URL query param `scenario`:
   ```ts
   const searchParams = useSearchParams();
   const activeScenarioKey = searchParams.get("scenario");
   ```
2. Data fetching with `Promise.allSettled`:
   - `client.fetchEntitlements(token)`
   - `client.fetchScenarios(token)`
   - `client.fetchProgress(token)`
3. Separate scenarios:
   - `curatedScenarios`: scenarios matching default 6 keys.
   - `customScenarios`: scenarios where `isCustom === true` or `category === 'CUSTOM'`.
4. Render layout:
   - Welcome header with localized greeting.
   - `TestingEntitlementCard` with live balance.
   - Custom Interview Hero Banner linking to `/app/scenarios/custom`.
   - `CuratedScenarioGrid` with 6 cards.
   - Conditionally render "My Custom Interviews" section if `customScenarios.length > 0`.
   - `ScenarioBriefingModal` open when `activeScenarioKey !== null`.
5. Handlers:
   - Card click: `router.replace(`/app?scenario=${encodeURIComponent(key)}`, { scroll: false })`.
   - Modal close: `router.replace("/app", { scroll: false })`.
   - Start practice: `client.createAttempt(...)` -> `router.push(`/app/simulations/${attempt.id}`)`.

- [ ] **Step 2: Update legacy route `/app/scenarios/[scenarioKey]/page.tsx`**

Replace `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx` with a lightweight redirect component that routes immediately to `/app?scenario=${encodeURIComponent(scenarioKey)}`.

- [ ] **Step 3: Write tests for `/app/app/page.tsx`**

Create `apps/web/src/app/app/page.test.tsx` verifying:
1. Renders `TestingEntitlementCard`, custom interview banner, and `CuratedScenarioGrid`.
2. Sets `?scenario=[key]` in URL when a card is selected.
3. Calls `createAttempt` and navigates to simulation when practice is started.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter web test apps/web/src/app/app/page.test.tsx`  
Commit:
```bash
git add apps/web/src/app/app/page.tsx apps/web/src/app/app/page.test.tsx apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx
git commit -m "feat(web): redesign /app as dedicated Practice Hub with URL-synced briefing modal"
```

---

### Task 6: Redesign Custom Interview Wizard (`/app/scenarios/custom`)

**Files:**
- Modify: `apps/web/src/components/scenarios/custom-interview-wizard.tsx`
- Modify: `apps/web/src/components/scenarios/custom-interview-wizard.test.tsx`

**Interfaces:**
- Consumes: `createApiClient`, `DifficultySelector`, `LanguageDialectSelector`, `PracticeModeSelector`, `useLocale`.
- Produces: Upgraded `CustomInterviewWizard` with Warm Coral tokens, full bilingual support, and complete practice configuration before launch.

- [ ] **Step 1: Refactor CustomInterviewWizard styling and controls**

In `apps/web/src/components/scenarios/custom-interview-wizard.tsx`:
1. Remove all legacy brutalist classes: `shadow-[3px_3px_0px_0px_#1a1a1a]`, `shadow-[4px_4px_0px_0px_#1a1a1a]`. Replace with `--shadow-card`, `--shadow-raised`, `border-border-subtle`.
2. Add full Arabic translation parity using `useLocale()`.
3. In Step 4 (Review):
   - Add `LanguageDialectSelector` and `PracticeModeSelector` alongside `DifficultySelector` so the user can choose their practice language and mode before starting.
   - Pass selected `language`, `dialect`, and `interactionMode` to `client.createAttempt`.
   - Update quota note: *"Generating this scenario is free. Starting practice consumes 1 of your weekly sessions."*

- [ ] **Step 2: Update and run CustomInterviewWizard tests**

Update `apps/web/src/components/scenarios/custom-interview-wizard.test.tsx` to verify:
1. Rejects non-PDF files and files > 5MB.
2. Validates minimum 50 characters on job description.
3. Renders generating state with pulse.
4. Renders practice configuration controls in review step and creates attempt with chosen parameters.

- [ ] **Step 3: Run tests and commit**

Run: `pnpm --filter web test apps/web/src/components/scenarios/custom-interview-wizard.test.tsx`  
Commit:
```bash
git add apps/web/src/components/scenarios/custom-interview-wizard.tsx apps/web/src/components/scenarios/custom-interview-wizard.test.tsx
git commit -m "refactor(web): redesign CustomInterviewWizard with Warm Coral styling and practice configuration"
```

---

### Task 7: Integration Verification & Regression Gate

**Files:**
- Modify: `docs/PROJECT_STATE.md`
- Modify: `docs/REDESIGN_PLAN.md`

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`  
Expected: 0 errors across all workspaces (`apps/web`, `apps/api`, `packages/contracts`).

- [ ] **Step 2: Run linter**

Run: `pnpm lint`  
Expected: 0 lint errors.

- [ ] **Step 3: Run test suite**

Run: `pnpm test`  
Expected: All tests passing across the monorepo.

- [ ] **Step 4: Update PROJECT_STATE.md and REDESIGN_PLAN.md**

1. In `docs/REDESIGN_PLAN.md`:
   - Mark R13, R14, R15 as completed `[x]`.
2. In `docs/PROJECT_STATE.md`:
   - Update Active Milestone to M05 — Call Simulation Workspace.
   - Update Next Task to R16–R20.
   - Record completed M04 milestone.

- [ ] **Step 5: Commit documentation and release gate**

```bash
git add docs/PROJECT_STATE.md docs/REDESIGN_PLAN.md
git commit -m "docs: record completion of Milestone M04 Discovery and Setup"
```
