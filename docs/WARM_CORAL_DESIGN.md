# WARM_CORAL_DESIGN.md

## 1. Visual Direction & Brand Philosophy (Concept A)
- **Philosophy**: Light-only deliberate practice application designed for psychological safety and professional confidence. A warm off-white canvas, crisp white cards, warm coral accents, terracotta action triggers, charcoal typography, and soft ambient elevation.
- **Strict Invariants**:
  - **Light mode only**: `color-scheme: light`. No dark theme.
  - **No neo-brutalism**: Zero hard 2px/3px black outlines, zero offset black drop-shadows (e.g. `shadow-[2px_2px_0px_#000]`), zero harsh comic-strip borders.
  - **No blue/purple gradients**: Eliminate legacy electric blue (`#0052ff`) and purple hues (`oklch(52.82% 0.2628 262.87)`).
  - **Bilingual parity**: Complete Modern Standard Arabic (MSA) and English (EN) parity across all screens and user flows.
  - **Static fictional portraits**: Bundled realistic adult portraits per scenario; no camera, learner video, lip-sync, or animated avatars.

---

## 2. Token Architecture & Theme Values (R03)

### 2.1 Core Palette & Semantic Tokens
All tokens are strictly defined for light mode with verified WCAG contrast ratios against `#FAF8F5` (Canvas) and `#FFFFFF` (Card Surfaces):

| Token Name | Hex Value | CSS Variable | Semantic Purpose | Contrast Ratio |
|---|---|---|---|---|
| **Canvas Background** | `#FAF8F5` | `--background` | Main page background, warm off-white | Base canvas |
| **Surface Solid** | `#FFFFFF` | `--surface-solid` | Primary cards, modals, input backgrounds | Base surface |
| **Surface Translucent** | `rgba(255,255,255,0.92)` | `--surface` | Sticky headers, backdrop blur | — |
| **Surface Subtle** | `#F5F1EC` | `--surface-subtle` | Secondary badges, muted containers | — |
| **Selected Surface** | `#FFF0EB` | `--selected-surface` | Active filters, selected scenario cards, active tabs | 1.1:1 on white |
| **Border Neutral** | `#E5E1DD` | `--border` | Card outlines, dividers, input borders | 1.3:1 (structural) |
| **Border Subtle** | `#EFECE8` | `--border-subtle` | Sub-item dividers inside cards | — |
| **Border Active** | `#F47765` | `--border-active` | Active card borders, active input border | 2.5:1 on surface |
| **Text Primary** | `#292725` | `--foreground` | Main headings, body copy, key numbers | 13.9:1 on `#FFF` (AAA) |
| **Text Muted** | `#625B57` | `--muted-foreground` | Subtitles, helper text, timestamps, labels | 5.2:1 on `#FFF` (AA) |
| **Brand Coral** | `#F47765` | `--brand-coral` | Vector logo mark, progress fills, badges | 2.5:1 (graphic) |
| **Action Primary** | `#B84132` | `--primary` | Primary buttons, CTA buttons, active state | 5.4:1 on white (AA) |
| **Action Hover** | `#A23527` | `--primary-hover` | Button hover and pressed state | 6.8:1 on white (AAA)|
| **Action Muted** | `#FFF0EB` | `--primary-muted` | Background for primary-tinted chips/buttons | — |
| **Action Foreground**| `#FFFFFF` | `--primary-foreground`| Text on primary buttons | 5.4:1 on `#B84132` |
| **Success** | `#107E52` | `--success` | Objectives achieved, top skill score | 4.8:1 on white (AA) |
| **Success Surface** | `#EBF7F0` | `--success-surface`| Background for success badge/card | — |
| **Success Text** | `#065F46` | `--success-foreground`| Dark green text on success surface | 7.8:1 on `#EBF7F0` |
| **Alert / Warning** | `#C94A29` | `--alert` | Needs improvement, retry alert, quota warning | 4.6:1 on white (AA) |
| **Alert Surface** | `#FDF1EC` | `--alert-surface` | Background for alert badge/card | — |
| **Alert Text** | `#991B1B` | `--alert-foreground` | Dark red/terracotta text on alert surface | 7.2:1 on `#FDF1EC` |
| **Analysis / Coaching**| `#7E45B2` | `--analysis` | Coaching moments, strategic skill tips | 5.1:1 on white (AA) |
| **Analysis Surface**| `#F5EEFA` | `--analysis-surface`| Background for coaching badge/card | — |
| **Analysis Text** | `#581C87` | `--analysis-foreground`| Deep purple text on analysis surface | 8.4:1 on `#F5EEFA` |
| **Focus Ring** | `#B84132` | `--focus-ring` | Keyboard focus ring on all controls | 3.5:1 against canvas |

---

## 3. Typography System (R03)

### 3.1 Font Stacks
- **Body & Headings (Latin)**: `var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Body & Headings (Arabic)**: `var(--font-noto-arabic), "Segoe UI", Tahoma, Arial, sans-serif`
- **Monospace (Scores, Timers, Metadata)**: `var(--font-jetbrains-mono), "SFMono-Regular", Consolas, monospace`
- **CRITICAL ARABIC RULE**: Arabic text must **NEVER** have positive letter-spacing (`letter-spacing: 0` / `tracking-normal`). Letter-spacing breaks cursive glyph connections in Arabic.

### 3.2 Typography Scale

| Style Level | Size (px / rem) | Line Height | Weight | Tailwind Class | Usage |
|---|---|---|---|---|---|
| **Display 2XL** | 36px / 2.25rem | 1.2 (2.7rem) | Bold (700) | `text-4xl font-bold` | Landing page hero header |
| **Display XL (H1)** | 30px / 1.875rem | 1.25 (2.35rem)| Bold (700) | `text-3xl font-bold` | Practice selection & results header |
| **Display LG (H2)** | 24px / 1.5rem | 1.3 (1.95rem) | Semibold (600)| `text-2xl font-semibold` | Section titles, scenario modal titles |
| **Display MD (H3)** | 20px / 1.25rem | 1.35 (1.7rem) | Semibold (600)| `text-xl font-semibold` | Card titles, counterpart name in stage |
| **Body Large** | 18px / 1.125rem | 1.5 (1.7rem) | Regular (400) | `text-lg` | Introductory callouts, lead paragraphs |
| **Body Base** | 16px / 1rem | 1.55 (1.55rem)| Regular (400) | `text-base` | Default body copy, transcript bubbles |
| **Body Small** | 14px / 0.875rem | 1.5 (1.3rem) | Medium (500) | `text-sm font-medium` | Button labels, card synopsis, input labels |
| **Caption / Badge** | 12px / 0.75rem | 1.4 (1.05rem) | Medium (500) | `text-xs font-medium` | Status chips, timestamps, difficulty tags |
| **Meta Mono** | 12px / 0.75rem | 1.4 (1.05rem) | Semibold (600)| `font-mono text-xs` | Numerical scores, timer, shortcut keys |

---

## 4. Spacing, Elevation, Radii & Interaction States (R03)

### 4.1 Spacing Scale (4px Baseline)
- `space-1`: 4px (`0.25rem`)
- `space-2`: 8px (`0.5rem`)
- `space-3`: 12px (`0.75rem`)
- `space-4`: 16px (`1rem`)
- `space-5`: 20px (`1.25rem`)
- `space-6`: 24px (`1.5rem`)
- `space-8`: 32px (`2rem`)
- `space-10`: 40px (`2.5rem`)
- `space-12`: 48px (`3rem`)
- `space-16`: 64px (`4rem`)

### 4.2 Interactive Target Rule
- **Strict 44px Minimum**: All clickable buttons, inputs, pills, select targets, and links must have a minimum interactive dimension of `44px × 44px` (`min-h-[44px]` and `min-w-[44px]` or adequate padding).

### 4.3 Corner Radii
- `--radius-control`: `10px` (`0.625rem`) — Buttons, input fields, selects, textarea.
- `--radius-card`: `16px` (`1rem`) — Cards, modal dialogs, stage containers.
- `--radius-pill`: `9999px` — Badges, category pills, timer chips, status tags.

### 4.4 Elevation & Soft Ambient Shadows
Replaces harsh brutalist offset black shadows with soft ambient lighting:
- **Card Shadow (`--shadow-card`)**: `0 2px 8px -2px rgba(41, 39, 37, 0.06), 0 1px 3px -1px rgba(41, 39, 37, 0.04)`
- **Hover / Interactive Shadow (`--shadow-raised`)**: `0 6px 18px -4px rgba(41, 39, 37, 0.08), 0 2px 6px -2px rgba(41, 39, 37, 0.04)`
- **Overlay / Modal Shadow (`--shadow-overlay`)**: `0 16px 36px -8px rgba(41, 39, 37, 0.12), 0 4px 12px -2px rgba(41, 39, 37, 0.06)`

### 4.5 Focus, Error & Form States
- **Focus Ring**: `outline: 3px solid #B84132; outline-offset: 2px;`
- **Input Idle**: `border: 1px solid #E5E1DD; background-color: #FFFFFF; color: #292725;`
- **Input Hover**: `border-color: #C5BFB9;`
- **Input Active / Focus**: `border-color: #B84132; box-shadow: 0 0 0 3px rgba(184, 65, 50, 0.15);`
- **Input Error**: `border-color: #C94A29; background-color: #FFF7F5;`
- **Error Helper Text**: `#991B1B; font-size: 13px; font-weight: 500; margin-top: 4px;`

---

## 5. Brand Identity & Vector Assets (R02)

### 5.1 Concept A Speech Mark & Lockups
- **Brand Name**: Kalemny / كلمني
- **Vector Mark Geometry**: Smooth dialogue bubble with warm coral gradient (`#F47765` to `#B84132`) and three crisp white dialogue aperture dots (representing vocal turn-taking and conversational dialogue).
- **Available Production Assets**:
  - `apps/web/src/assets/logo-mark.svg` (Standalone vector mark)
  - `apps/web/src/assets/logo-en.svg` (English lockup: mark + "Kalemny")
  - `apps/web/src/assets/logo-ar.svg` (Arabic lockup: "كلمني" + mark)
  - `apps/web/src/assets/logo-bilingual.svg` (Bilingual lockup: mark + "Kalemny" | "كلمني")
  - `apps/web/src/components/brand-logo.tsx` (React component with `sm`, `md`, `lg` sizes and full direction support)

---

## 6. Mobile Simulation Workspace Architecture (R04)

### 6.1 Viewport Targets & Height Budgets
The mobile simulation workspace is engineered to eliminate cramped controls, prevent overlapping elements, and ensure continuous visibility of the transcript across 360px and 390px screens.

#### Viewport Budget Table

| Component Zone | 360 × 667px (Closed) | 360 × 667px (Keyboard Open ~280px) | 390 × 844px (Closed) | 390 × 844px (Keyboard Open ~300px) |
|---|---|---|---|---|
| **Top Header** | 48px | 48px | 48px | 48px |
| **Counterpart Stage** | 124px (compact portrait 60px) | **36px (mini strip)** | 136px (portrait 64px) | **40px (mini strip)** |
| **Scrolling Transcript**| **315px** (3–5 bubbles) | **235px** (2–3 bubbles) | **470px** (5–8 bubbles) | **388px** (4–5 bubbles) |
| **Composer Row** | 56px (full width) | 56px (docked above kbd) | 58px (full width) | 58px (docked above kbd) |
| **Dedicated Mic Row** | 52px | *Collapsed/hidden while typing* | 54px | *Collapsed/hidden while typing* |
| **Safe Area Bottom** | 8px | 0px | 34px | 0px |
| **Virtual Keyboard** | 0px | 280px | 0px | 300px |
| **Total Height** | 667px | 667px | 844px | 844px |

### 6.2 Key Interaction Behaviors
1. **Compact Counterpart Stage**:
   - **Keyboard Closed**: Centered or side-by-side thumbnail (60×60px or 64×64px), counterpart name and role, live state badge ("Your turn" / "Listening" / "AI speaking").
   - **Stop Playback Action**: Placed directly beside the speaking state badge in the counterpart stage (never squeezed into the input controls).
   - **Keyboard Open Transition**: The stage smoothly collapses into a 36px horizontal strip (`h-9 flex items-center gap-2`), keeping the counterpart thumbnail (28px) and status visible while unlocking over 90px of vertical space for the active transcript.
2. **Dedicated Full-Width Composer Row**:
   - Spans 100% of container width.
   - Expandable textarea (min 44px, max 96px).
   - Inline Send button (44px target) pinned inside or immediately adjacent to composer with clear icon and label.
3. **Dedicated Microphone Row (Below Composer)**:
   - Separate, spacious row below the text composer.
   - In Idle state: Center pill button ("Tap to talk" / "اضغط للتحدث", min-height 44px, terracotta/coral accent).
   - In Recording state: Visible timer counter ("0:14 / 2:00"), audio waveform/pulse indicator, prominent "Done" button (`#B84132`), and secondary "Cancel" button.
   - When virtual keyboard opens for typing: The dedicated mic row gracefully yields space and folds into an inline mic icon in the composer bar, avoiding layout distortion. Dismissing the keyboard restores the full mic row.
4. **Scrolling Transcript Visibility**:
   - Anchored between counterpart stage and composer.
   - Always auto-scrolls to the newest message when new turns arrive.
   - If learner scrolls up to read previous turns, a subtle floating pill appears: "Jump to latest" / "الانتقال إلى الأحدث".

---

## 7. Screen Mapping & Reviewed Bilingual Copy Directory (R05)

### 7.1 Screen Architecture Overview

```
Public Landing (/)
  ├── Sign In (/sign-in)
  └── Sign Up (/sign-up)
        ↓
Practice Selection (/app)  <── Primary Authenticated Hub
  ├── Curated Scenario Briefing Modal (/app)
  ├── Custom Interview Setup (/app/scenarios/custom)
  ├── Call Simulation Workspace (/app/simulations/:attemptId)
  │     └── Results & Coaching (/app/results/:attemptId)
  │           └── Retry Flow (Creates fresh attempt of same scenario)
  ├── Attempt History (/app/history)
  └── Rolling Progress (/app/progress)
```

### 7.2 Detailed Screen Mapping & Functional Requirements

#### Screen 1: Practice Selection (`/app`)
- **Header**: BrandLogo (bilingual/active locale), Practice (`/app`), History (`/app/history`), Progress (`/app/progress`), Language switch toggle (`EN` / `عربي`), User Profile button.
- **Top Testing Entitlement Card**:
  - Displays weekly free quota: "3 free simulation starts per rolling 7 days across all scenarios".
  - Live server-authoritative count: e.g. "2 of 3 sessions remaining this week".
  - Friendly reassurance: "Practicing resets automatically on a rolling 7-day window."
- **Custom Interview Banner**:
  - Placed prominently above the curated scenarios list.
  - Heading: "Prepare for your real job interview" / "استعد لمقابلتك الوظيفية الحقيقية".
  - Subtitle: "Upload your CV and paste the job description to practice tailored questions grounded in your experience."
  - CTA Button: "Create custom interview" / "إنشاء مقابلة مخصصة" (links to `/app/scenarios/custom`).
- **6 Curated Scenarios Grid**:
  - Displayed directly in an equal-weight 2-column or 3-column grid (1-column on mobile).
  - Cards include: static counterpart portrait thumbnail, scenario title, category tag, difficulty chip, 2-line situation summary, subtle recommendation badge if applicable ("Recommended for you" / "مقترح لك").
  - Clicking card opens the **Scenario Briefing Modal** (does NOT immediately start attempt).
- **Scenario Briefing Modal**:
  - Full scenario context, counterpart background, and practice objectives.
  - Controls: Difficulty selector (Easy / Medium / Hard), Language & Dialect selector (English / Arabic - Egyptian / Arabic - Gulf), Mode selector (Interactive Voice / Hands-free Call / Text).
  - Primary CTA: "Start Practice" / "ابدأ الجلسة" (consumes 1 weekly start).

#### Screen 2: Custom Interview Wizard (`/app/scenarios/custom`)
- **Step 1**: In-memory CV PDF upload (drag & drop, max 5MB, client validation).
- **Step 2**: Job description textarea (50–20,000 characters).
- **Step 3**: Instant AI scenario generation review (displays parsed job title, counterpart persona, focus objectives).
- **Policy Invariant**: Generating a custom scenario is 100% free and does **NOT** deduct from the 3-session quota. Only pressing "Start Practice" deducts a session.

#### Screen 3: Call Simulation Workspace (`/app/simulations/:attemptId`)
- **Header**: Back to practice link, Scenario Title, Real-time session elapsed timer, "Finish conversation" button.
- **Desktop Layout (Split)**:
  - Left pane: Counterpart portrait stage (fictional portrait, name, role, AI partner label, audio playback wave, stop button).
  - Right pane: Continuously visible transcript (learner turns on start/right, counterpart turns on start/left, retry indicators).
  - Bottom docked panel: Full-width composer + spacious microphone row.
- **Mobile Layout (Stacked)**:
  - Header (48px)
  - Compact Stage (124px closed / 36px keyboard open)
  - Visible scrolling transcript (flex-1)
  - Dedicated Composer row + Separate dedicated mic row.

#### Screen 4: Results & Coaching (`/app/results/:attemptId`)
- **Overall Score Card**:
  - Score circle (0–100) calculated deterministically: `round(0.70 * universalAvg + 0.30 * objectiveScore)`.
  - Supportive, empowering summary paragraph based on performance.
- **Evidence-Linked Coaching**:
  - Strengths section citing real stored turn IDs (e.g. "Turn 3: You clearly stated your salary expectation without hesitation").
  - Growth areas citing real stored turn IDs (e.g. "Turn 5: When the manager pushed back, you conceded too quickly").
  - Suggestion cards with explicit badge: "Suggested phrasing" / "صياغة مقترحة" (grounded strictly in what happened).
- **5 Universal Skills Grid (0–100)**:
  - Communication Clarity
  - Active Listening
  - Professional Composure
  - Assertiveness & Boundary Setting
  - Strategic Reasoning
- **Scenario Objectives Status**:
  - Badges: Achieved / Partially Achieved / Missed.
- **Actions**:
  - "Practice again" / "إعادة التدرّب" (creates a fresh attempt with the same difficulty/language; counts as 1 start).
  - "Explore other scenarios" / "استكشف مواقف أخرى" (navigates back to `/app`).

#### Screen 5: Attempt History (`/app/history`)
- List of past attempts with date, scenario title, counterpart, score badge, language tag.
- Actions: "View results", "Retry", "Delete attempt" (with confirmation dialog; deleting an attempt never restores weekly quota).

#### Screen 6: Rolling Progress (`/app/progress`)
- 5-session rolling averages computed from the latest 5 completed attempts with >= 3 substantive turns.
- Weakest skill callout with actionable practice tip and direct link to relevant scenario.

---

### 7.3 Reviewed Bilingual Copy Inventory (Modern Standard Arabic & English)

| Key / Element | English (EN) | Modern Standard Arabic (AR) |
|---|---|---|
| **App Title** | Kalemny | كلمني |
| **Tagline** | AI Workplace Communication Simulator | منصة التدريب الذكي على المحادثات المهنية |
| **Nav: Practice** | Practice | التدرّب |
| **Nav: Custom** | Interview Prep | التحضير للمقابلات |
| **Nav: History** | History | السجل |
| **Nav: Progress** | Progress | تقدّمي |
| **Quota: Banner Title** | Free Testing Access | وصول مجاني للتجربة |
| **Quota: Usage** | {remaining} of {limit} sessions remaining this week | متبقي لك {remaining} من {limit} جلسات هذا الأسبوع |
| **Custom: Title** | Prepare for your real job interview | استعد لمقابلتك الوظيفية الحقيقية |
| **Custom: Subtitle** | Practice with a personalized AI interviewer tailored to your CV and target job description. | تدرّب مع محاور ذكي مخصص وفقاً لسيرتك الذاتية ووصف الوظيفة المستهدفة. |
| **Custom: Button** | Create custom interview | إنشاء مقابلة مخصصة |
| **Scenario: Salary** | Salary Negotiation | التفاوض على الراتب |
| **Scenario: Salary Desc** | Advocate for fair compensation during a job offer or annual review. | تفاوض بثقة على راتب عادل عند تلقي عرض عمل أو أثناء التقييم السنوي. |
| **Scenario: Interview**| Behavioral Interview | المقابلة الوظيفية السلوكية |
| **Scenario: Interview Desc** | Answer challenging situational questions using the STAR framework. | أجب عن الأسئلة الموقفية الصعبة باستخدام نموذج STAR باحترافية. |
| **Scenario: Promotion**| Promotion Request | طلب ترقية |
| **Scenario: Promotion Desc**| Build a compelling, evidence-based business case for your advancement. | قدّم حيثيات مقنعة ومستندة إلى إنجازاتك للحصول على ترقيتك المستحقة. |
| **Scenario: Pushback** | Manager Pushback | مناقشة الأولويات مع المدير |
| **Scenario: Pushback Desc**| Align expectations and defend realistic timelines when workload surges. | وازن التوقعات ودافع عن مواعيد واقعية عند تراكم ضغط العمل. |
| **Scenario: Feedback** | Difficult Feedback | تقديم ملاحظات بناءة |
| **Scenario: Feedback Desc**| Deliver sensitive performance feedback with empathy and constructive clarity.| وجّه ملاحظات حساسة لفريقك بتعاطف ووضوح بنّاء ومثمر. |
| **Scenario: Scope** | Scope Creep | إدارة توسع نطاق المشروع |
| **Scenario: Scope Desc**| Set firm professional boundaries when client demands exceed agreements.| ضع حدوداً مهنية واضحة عندما تتجاوز طلبات العميل ما تم الاتفاق عليه. |
| **Badge: Recommended** | Recommended for you | مقترح لك |
| **Diff: Easy** | Foundation | أساسي |
| **Diff: Medium** | Standard | متوسط |
| **Diff: Hard** | Challenging | متقدم |
| **Action: Start** | Start Practice | ابدأ التدرّب |
| **Action: Cancel** | Cancel | إلغاء |
| **Action: Done** | Done | تم |
| **Action: Send** | Send | إرسال |
| **Action: Retry** | Practice Again | إعادة التدرّب |
| **Status: Your Turn** | Your turn to speak | دورك في الحديث |
| **Status: Listening** | Listening… | نستمع إليك الآن… |
| **Status: Transcribing**| Transcribing your voice… | جارٍ تحويل الصوت إلى نص… |
| **Status: Thinking** | Counterpart is preparing a response… | المحاور يجهز الرد الآن… |
| **Status: Speaking** | Counterpart is speaking (tap to interrupt) | المحاور يتحدث (اضغط للمقاطعة) |
| **Action: Stop Audio** | Stop audio | إيقاف الصوت |
| **Voice: Tap to Talk** | Tap to talk | اضغط للتحدث |
| **Voice: Release** | Tap Done when finished | اضغط تم عند الانتهاء |
| **Composer: Placeholder**| Type your response here… | اكتب ردك هنا… |
| **Results: Title** | Practice Session Feedback | تقرير أداء جلسة التدرّب |
| **Results: Score** | Overall Practice Score | النتيجة الإجمالية للجلسة |
| **Results: Strengths**| Key Strengths | نقاط القوة الرئيسية |
| **Results: Growth** | Areas for Improvement | فرص التحسين والتطوير |
| **Results: Suggestion**| Suggested Phrasing | صياغة بديلة مقترحة |
| **Skill: Clarity** | Communication Clarity | وضوح التواصل |
| **Skill: Listening**| Active Listening | الاستماع النشط |
| **Skill: Composure**| Professional Composure | الهدوء والثبات المهني |
| **Skill: Boundaries**| Assertiveness & Boundaries | الحزم ووضع الحدود |
| **Skill: Reasoning** | Strategic Reasoning | التفكير الاستراتيجي والإقناع |
| **Obj: Achieved** | Achieved | تم تحقيقه بنجاح |
| **Obj: Partial** | Partially Achieved | تم تحقيقه جزئياً |
| **Obj: Missed** | Needs Attention | بحاجة إلى تركيز |

---

## 8. Accessibility & Engineering Invariants

1. **44px Touch Targets**: Minimum 44px for interactive controls.
2. **Contrast Verification**:
   - 13.9:1 Text Primary on Surface
   - 5.4:1 Action Terracotta on Surface
   - 5.4:1 White on Action Terracotta
   - 4.8:1 Success on Surface
   - 4.6:1 Alert on Surface
3. **Bilingual Layout Properties**:
   - Use CSS logical properties exclusively: `margin-inline-start` (`ms-*`), `margin-inline-end` (`me-*`), `padding-inline-start` (`ps-*`), `padding-inline-end` (`pe-*`), `start-*`, `end-*`.
   - Never mirror portraits, timer numerals, or non-directional iconography.
   - Mirror directional icons (back arrows, breadcrumbs, forward arrows) using `[dir="rtl"] .directional-icon { transform: scaleX(-1); }`.
4. **Resilience & Fallbacks**:
   - Text fallback is always available if microphone permissions are denied or voice capture fails.
   - Zero transcript loss: If network error occurs during a turn submission, draft remains preserved in composer.
