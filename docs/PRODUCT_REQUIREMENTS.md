# PRODUCT_REQUIREMENTS.md

## 1. Product & Primary Users
**Kalemny / كلمني** is a deliberate-practice web application for students and early-career professionals to rehearse difficult workplace conversations with adaptive AI, receive structured coaching, retry, and track improvement.
Bilingual: English (`en`) and Arabic (`ar`) (Modern Standard Arabic UI, Egyptian & Gulf conversation dialects).
Core Loop: `Scenario → Simulation → Evaluation → Coaching → Retry → Progress`

## 2. Scenarios & Difficulty
### Curated Scenarios (6)
1. **Salary Negotiation** — Counteroffer negotiation with hiring manager
2. **Behavioral Interview** — STAR-method answering to senior interviewer
3. **Promotion Request** — Making the business case to direct manager
4. **Manager Pushback** — Respectfully disagreeing with managerial directive
5. **Teammate Feedback** — Delivering constructive feedback to peer
6. **Scope Creep / Saying No** — Pushing back professionally on unrealistic scope
Each scenario defines learner role, AI persona, learner objective, AI objections, and immutable versioned definitions.

### Custom Interview Generation
Learners upload CV PDF (in-memory parsing via `unpdf`, up to 5MB, zero disk/DB persistence) and target Job Description (50–20,000 chars). Generates an owner-scoped, factual workplace interview scenario (`category: CUSTOM`).

### Difficulty Levels
- **Easy**: Receptive counterpart, hints, lower resistance.
- **Medium**: Balanced realism, typical workplace pushback, requires structured argument.
- **Hard**: Skeptical counterpart, interruptions, high scrutiny, tests composure.

## 3. Simulation & Voice
- **Text Mode**: Real-time text chat in structured simulation stage.
- **Push-to-Talk**: In-memory WebM/WAV capture via MediaRecorder (max 120s), transcribed via Whisper STT into editable composer. Raw audio never stored. Text fallback always available.
- **Continuous Hands-Free Call (`REALTIME`)**: Web Audio silence detection (VAD), automatic turn-taking, barge-in / speech interruption, and neural Edge-TTS playback.
- **Text-to-Speech**: Optional on-demand neural voice synthesis via backend Edge-TTS adapter (Arabic & English). TTS failure never blocks conversation.

## 4. Session Lifecycle & Limits
- **States**: `ACTIVE → EVALUATING → COMPLETED` (or `EVALUATION_FAILED`, `ABANDONED`).
- **Limits**: Max 20 learner turns, ~15-minute simulation limit, max 120s per voice recording.
- **Testing Entitlement**: 3 simulation starts per rolling 7 days across all scenario types (curated + custom). Generation is not a simulation start. Retries count as new starts. Attempt deletion never restores quota.

## 5. Evaluation & Deterministic Scoring
Evaluation is decoupled from roleplay and executed after simulation ends.
- **5 Universal Skills (0–100)**: Clarity, Assertiveness, Empathy, Structure, Conciseness.
- **Scenario Objectives**: Discrete outcomes: `Achieved` (100), `Partially Achieved` (50), `Missed` (0).
- **Deterministic Overall Score**:
  `Universal Score = Average(5 Skills)`
  `Overall Score = round(0.70 * Universal Score + 0.30 * Scenario Objective Score)`
- **Evidence-Linked Coaching**: Strengths, improvements, and stronger-response examples must reference real stored turn IDs. No fabricated learner quotes. No invented external facts or numbers.
- **Deterministic Progress**: Average of latest 5 eligible completed sessions (min 3 substantive turns). Sessions with <3 turns receive evaluation but do not contribute to progress.

## 6. Scope Boundaries & Non-Goals
- Out of scope: Languages beyond EN/AR, animated avatars, lip-sync, video recording, multi-user/collaboration, payment processing during testing, enterprise LMS.
