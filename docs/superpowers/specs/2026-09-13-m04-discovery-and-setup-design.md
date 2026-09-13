# Milestone M04: Discovery & Setup — Design Specification

## 1. Overview & Objectives

**Milestone**: M04 — Discovery & Setup (Phase 3: Core Simulation Loop)  
**Governing Documents**:
- [REDESIGN_PLAN.md](../../REDESIGN_PLAN.md) (Decision D04, Tasks R13, R14, R15)
- [WARM_CORAL_DESIGN.md](../../WARM_CORAL_DESIGN.md) (Section 7.2 Screen 1 & Screen 2, Section 7.3 Copy Inventory)
- [PROJECT_STATE.md](../../PROJECT_STATE.md) (Active Milestone M04)

### Objectives
1. **R13 — Redesign `/app` Practice Selection**:
   - Transform `/app` into a dedicated practice selection hub.
   - Display the weekly testing entitlement banner (`/api/v1/entitlements`): "3 free simulation starts per rolling 7 days across all scenarios".
   - Feature the custom interview hero banner prominently above the curated library with a direct CTA to `/app/scenarios/custom`.
   - Present the 6 curated scenarios in a responsive grid featuring bundled static portraits (`1.png` to `6.png`), metadata chips, and a subtle "Recommended for you" badge.
   - Display a dedicated "My Custom Interviews" section below the 6 curated cards for any user-generated interviews.
2. **R14 — Redesign Scenario Briefing Modal**:
   - Provide an in-place accessible modal (`ScenarioBriefingModal`) on `/app` controlled declaratively via `?scenario=[scenarioKey]`.
   - Render situation context, role descriptions, counterpart profile, and primary practice objectives.
   - Provide unified Warm Coral selectors for Difficulty, Language/Dialect (English, Arabic - Egyptian, Arabic - Gulf), and Practice Mode (Push-to-Talk vs. Live Call Hands-Free).
   - Display quota consumption reminder and an authoritative "Start Practice" action.
   - Gracefully redirect legacy `/app/scenarios/[scenarioKey]` routes to `/app?scenario=[scenarioKey]`.
3. **R15 — Redesign Custom Interview Wizard (`/app/scenarios/custom`)**:
   - Upgrade the CV/JD custom interview wizard to Warm Coral tokens and soft ambient shadows.
   - Support in-memory PDF CV upload (<= 5MB) and job description textarea (50–20,000 characters).
   - Provide clean generation loading feedback and a detailed scenario review step.
   - Embed the unified practice configuration selectors (Difficulty, Language/Dialect, Practice Mode) before launching rehearsal.

---

## 2. Route Architecture & Navigation

```
/app (Practice Selection Hub)
  ├── [Query: ?scenario=:key] ──> Opens ScenarioBriefingModal (in-place dialog)
  │                                 ├── Start Practice ──> POST /api/v1/simulations/attempts
  │                                 │                       └── Redirects to /app/simulations/:attemptId
  │                                 └── Close ──────────> Closes dialog, resets URL to /app
  │
  ├── [CTA: Create custom interview] ──> Links to /app/scenarios/custom
  │
  └── [Legacy Route: /app/scenarios/:scenarioKey] ──> Client redirect to /app?scenario=:scenarioKey

/app/scenarios/custom (Custom Interview Generation Wizard)
  ├── Step 1: Upload CV PDF + Step 2: Input Job Description
  ├── Step 3: Generating state (in-memory AI parsing)
  └── Step 4: Scenario Review & Practice Configuration
                └── Start Interview ──> POST /api/v1/simulations/attempts
                                          └── Redirects to /app/simulations/:attemptId
```

---

## 3. Component Architecture & Design

### 3.1 Practice Selection Hub (`apps/web/src/app/app/page.tsx`)

#### Layout Hierarchy
1. **Testing Entitlement Card (`TestingEntitlementCard`)**:
   - Positioned at top of page canvas.
   - Visual: `bg-surface-solid border border-border-subtle rounded-card p-5 sm:p-6 shadow-xs`.
   - Copy (Bilingual):
     - English: *"Free Testing Access — {remaining} of {limit} sessions remaining this week. Practicing resets automatically on a rolling 7-day window."*
     - Arabic: *"وصول مجاني للتجربة — متبقي لك {remaining} من {limit} جلسات هذا الأسبوع. تتجدد الجلسات تلقائياً كل 7 أيام بشكل متجدد."*
   - Quota Warning: If `remaining === 0`, render alert styling (`bg-alert-surface border-alert/20 text-alert-foreground`).
2. **Custom Interview Entry Banner (`CustomInterviewBanner`)**:
   - Positioned below the entitlement card.
   - Visual: `bg-primary-muted border border-primary/20 rounded-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6`.
   - Copy:
     - Heading: *"Prepare for your real job interview / استعد لمقابلتك الوظيفية الحقيقية"*
     - Body: *"Upload your CV and paste the job description to practice tailored questions grounded in your experience. / تدرّب مع محاور ذكي مخصص وفقاً لسيرتك الذاتية ووصف الوظيفة المستهدفة."*
     - Badge: *"Free scenario generation / إنشاء مجاني للسيناريو"*
     - Button: Primary Warm Coral CTA (`bg-primary text-primary-foreground min-h-[44px] min-w-[44px]`) linking to `/app/scenarios/custom`.
3. **Curated Scenarios Grid (`CuratedScenarioGrid`)**:
   - Section heading: *"Practice Scenarios / سيناريوهات التدرّب"* with count badge (*6 scenarios*).
   - Responsive grid: 1-column on mobile (`<640px`), 2-column on tablet (`640px–1024px`), 3-column on desktop (`>1024px`).
   - Card (`ScenarioCard`):
     - Static fictional counterpart portrait: 56×56px rounded thumbnail (`rounded-xl overflow-hidden border border-border-subtle`). Mapped from `lib/scenario-images.ts` (`1.png`–`6.png`).
     - Header: Category tag and Difficulty chip.
     - Recommendation badge: If `scenario.key === recommendedKey`, render subtle Warm Coral pill: `Recommended for you` / `مقترح لك` (`bg-primary-muted text-primary text-xs font-semibold`).
     - Title: `font-display text-xl sm:text-2xl font-semibold text-foreground group-hover:text-primary`. Localized via `scenario.titleAr` when `locale === 'ar'`.
     - Summary: 2-line clamped body copy. Localized via `scenario.summaryAr` when `locale === 'ar'`.
     - Footer button: *"View practice setup / تفاصيل التدرّب"* with `PlayIcon` and `ArrowRightIcon` (mirrored in RTL via `.directional-icon`).
4. **My Custom Interviews Section (`MyCustomInterviewsSection`)**:
   - Conditionally rendered if `customScenarios.length > 0`.
   - Section heading: *"My Custom Interviews / مقابلاتي المخصصة"*.
   - Rendered as cards with counterpart role, target job title, creation date, and trash button triggering `DeleteCustomScenarioDialog`.

---

### 3.2 Scenario Briefing Modal (`apps/web/src/components/scenarios/scenario-briefing-modal.tsx`)

Built with `AccessibleDialog` configured with `maxWidth="max-w-3xl"`:
- **Header**:
  - Title: Scenario title (localized).
  - Category and difficulty badges.
  - Close button (<kbd>Esc</kbd> or click backdrop).
- **Counterpart Profile Strip**:
  - Portrait thumbnail (48×48px).
  - Counterpart name and role (*"Speaking with: Sarah Jenkins, VP of Operations"* / *"تتحدث مع: سارة جنكينز، نائبة رئيس العمليات"*).
- **Briefing Context Cards**:
  - Situation card: Detailed workplace background.
  - Role cards: Two-column container showing *"Your Role"* and *"Counterpart Role"*.
  - Primary Objective card: Accentuated with primary border tint (`border-primary/20 bg-primary/5`) detailing the primary communication goal.
- **Practice Configuration Selectors**:
  - `DifficultySelector`:
    - Easy (Supportive), Medium (Realistic pushback), Hard (Challenging).
    - Updated to Warm Coral tokens (`border-border-subtle`, active state `bg-selected-surface border-border-active`).
  - `LanguageDialectSelector`:
    - English (`en`), Arabic Egyptian (`ar` / `EGYPTIAN`), Arabic Gulf (`ar` / `GULF`).
  - `PracticeModeSelector`:
    - Push-to-Talk (`PUSH_TO_TALK`) vs. Live Call Hands-Free (`REALTIME`).
- **Footer & Quota Action**:
  - Notice: *"Starting practice will consume 1 of your 3 weekly sessions."*
  - Primary button: *"Start Practice"* (`bg-primary text-primary-foreground min-h-[44px]`).
  - Out of quota state: Disabled button with explicit alert text explaining that quota will reset automatically on the rolling 7-day window.

---

### 3.3 Custom Interview Wizard (`apps/web/src/components/scenarios/custom-interview-wizard.tsx`)

Refactored to eliminate legacy brutalist shadows (`shadow-[3px_3px_0px_0px_#1a1a1a]`), aligning fully with Warm Coral tokens:
- **Step 1 (Candidate CV)**:
  - File dropzone supporting PDF only, maximum 5MB.
  - Client validation displaying instant feedback for non-PDF or oversized files.
  - Selected file pill with file size and remove button.
- **Step 2 (Target Job Description)**:
  - Textarea with character counter enforcing minimum 50 and maximum 20,000 characters.
  - Helpful placeholder encouraging pasting full job duties and requirements.
- **Step 3 (Generating State)**:
  - Warm coral pulsating indicator with reassuring bilingual copy.
  - Reassurance: In-memory CV parsing, zero permanent file storage.
- **Step 4 (Scenario Review & Rehearsal Setup)**:
  - Displays parsed company/role context, interviewer persona, and focus rubrics.
  - Reuses unified `DifficultySelector`, `LanguageDialectSelector`, and `PracticeModeSelector`.
  - Action button: *"Start Interview Practice"*, creating the attempt and navigating to `/app/simulations/[attemptId]`.

---

## 4. State Management & API Contracts

### 4.1 Data Fetching Flow
```ts
// apps/web/src/app/app/page.tsx
const [entitlementsResult, scenariosResult, progressResult] = await Promise.allSettled([
  client.fetchEntitlements(token),
  client.fetchScenarios(token),
  client.fetchProgress(token),
]);
```

### 4.2 Modal Synchronization
- Query param: `scenario`
- Read: `const activeScenarioKey = searchParams.get("scenario");`
- Open: `router.replace(`/app?scenario=${encodeURIComponent(scenarioKey)}`, { scroll: false });`
- Close: `router.replace("/app", { scroll: false });`

### 4.3 Attempt Creation Payload
```ts
POST /api/v1/simulations/attempts
{
  scenarioKey: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  language: "en" | "ar";
  dialect?: "EGYPTIAN" | "GULF";
  interactionMode: "PUSH_TO_TALK" | "REALTIME";
  retryOfAttemptId: null;
}
```

---

## 5. Accessibility, Ergonomics & Bilingual Parity

1. **Touch Targets**: Minimum `44px × 44px` interactive area across all cards, buttons, selectors, and modal dismissals.
2. **Keyboard Trapping & Dismissal**: Focus trapped inside `AccessibleDialog` when open; <kbd>Escape</kbd> key dismisses modal and restores focus to the triggering card.
3. **Contrast Compliance**:
   - Main text: 13.9:1 (`#292725` on `#FFFFFF`).
   - Primary buttons: 5.4:1 (`#FFFFFF` on `#B84132`).
   - Card borders: `#E5E1DD` (structural clarity).
4. **Bilingual Parity**:
   - Modern Standard Arabic (MSA) for all UI labels, headings, buttons, and helper tooltips.
   - Directional icons mirrored in RTL via `.directional-icon`.
   - Arabic text strictly maintains `tracking-normal` (zero letter spacing) to preserve cursive glyph connections.

---

## 6. Testing Strategy

1. **Component Tests**:
   - `apps/web/src/app/app/page.test.tsx`:
     - Renders weekly entitlement quota banner with correct balance.
     - Renders custom interview banner with CTA.
     - Renders all 6 curated scenario cards with counterpart portraits and recommendation badge.
     - Renders "My Custom Interviews" section when custom scenarios are present.
   - `apps/web/src/components/scenarios/scenario-briefing-modal.test.tsx`:
     - Opens when URL search param `scenario` is set.
     - Displays scenario context, roles, and objectives.
     - Updates difficulty, language/dialect, and interaction mode.
     - Dispatches `createAttempt` on click "Start Practice" and navigates to simulation.
     - Disables start button when `remaining === 0`.
   - `apps/web/src/components/scenarios/custom-interview-wizard.test.tsx`:
     - Enforces PDF format and <= 5MB validation.
     - Enforces minimum 50 characters on job description.
     - Verifies generation loading state and review setup transition.
2. **Regression & Build Verification**:
   - Run complete unit test suite (`pnpm test`).
   - Run typecheck across all workspaces (`pnpm typecheck`).
   - Run linter (`pnpm lint`).
