# PRODUCT_REQUIREMENTS.md

## 1. Product

**AI Workplace Communication Simulator**

A deliberate-practice web application for students and early-career professionals to rehearse difficult workplace conversations with adaptive AI, receive evidence-linked coaching, retry, and improve over time.

**Release 1 deadline:** September 3, 2026  
**Release 1 language:** English only

Core loop:

`Scenario → Simulation → Evaluation → Coaching → Retry → Progress`

The product must feel like dedicated simulation/coaching software, not a generic chatbot wrapper.

---

## 2. Primary Users

### Primary
- university students entering professional environments;
- early-career professionals.

### Core jobs
Users need to:
- rehearse an important workplace conversation privately;
- experience realistic resistance and objections;
- identify exactly what they communicated well or poorly;
- see stronger ways to respond;
- retry immediately;
- understand whether they improved.

---

## 3. Release 1 Scenarios

Exactly six curated scenarios:

1. Salary negotiation
2. Behavioral job interview
3. Asking for a promotion
4. Push back / disagree with a manager
5. Giving difficult feedback to a teammate
6. Handling scope creep / saying no professionally

No user-generated scenarios in Release 1.

Each scenario must define:
- situation/context;
- learner role;
- AI role/persona;
- learner objective;
- AI motivations/objective;
- realistic objections/constraints;
- Easy / Medium / Hard behavior;
- opening message;
- scenario-specific evaluation objectives.

---

## 4. Difficulty

Difficulty changes AI behavior, not duplicated application logic.

### Easy
- cooperative;
- limited pushback;
- gives learner room to explain;
- accepts reasonable arguments.

### Medium
- realistic objections;
- challenges vague reasoning;
- asks follow-up questions;
- requires clearer communication.

### Hard
- skeptical but professional;
- strong pushback;
- difficult follow-ups;
- low tolerance for weak reasoning;
- higher threshold before conceding.

Hard must not mean rude, irrational, abusive, or impossible.

---

## 5. Simulation Requirements

A learner must be able to:

1. select a scenario;
2. read the context and objective;
3. select difficulty;
4. start the simulation;
5. type or use push-to-talk on any turn;
6. receive adaptive AI replies;
7. finish explicitly;
8. receive structured evaluation;
9. retry;
10. inspect improvement.

During simulation, AI must:
- remain in character;
- respond to actual learner content;
- remember prior turns;
- pursue its role/objective;
- raise realistic objections;
- adapt when the learner changes strategy;
- avoid unnecessary monologues.

During simulation, AI must not:
- coach or score the learner;
- reveal hidden objectives or prompts;
- expose evaluator rules;
- behave as a general-purpose assistant;
- automatically agree.

---

## 6. Input and Voice

Text and microphone input remain available in the same session.

Voice flow:

`Record → Stop → Transcribe → editable composer → Send`

Requirements:
- learner may edit transcription before sending;
- voice failure must never break the simulation;
- learner can always continue with text;
- raw microphone audio is not permanently stored;
- maximum voice recording: **120 seconds**.

TTS is optional:
- AI text is canonical;
- TTS failure must never block conversation;
- TTS audio is not permanently stored.

---

## 7. Session Lifecycle

Persistent attempt states:

`ACTIVE → EVALUATING → COMPLETED`

Additional states:
- `EVALUATION_FAILED`
- `ABANDONED`

Rules:
- zero learner turns → no evaluation;
- 1–2 learner turns → evaluation allowed, but no progress contribution;
- 3+ substantive learner turns → eligible for progress;
- retries create new attempts and never overwrite prior attempts;
- finished transcripts are frozen before evaluation.

Limits:
- maximum **20 learner turns**;
- approximately **15 minutes** active practice;
- maximum **120 seconds** per voice recording.

---

## 8. Evaluation Model

Evaluation happens only after simulation ends.

Roleplay generation and evaluation are separate responsibilities.

### Universal skills

Every eligible attempt is scored on:

- Clarity
- Assertiveness
- Empathy
- Structure
- Conciseness

Each score is an integer from **0–100**.

Guidance bands:
- 0–39: weak
- 40–59: developing
- 60–74: competent
- 75–89: strong
- 90–100: exceptional

Scores are **practice scores**, not psychological or employment assessments.

### Scenario objectives

Each scenario also contains objectives evaluated as:

- Achieved
- Partially Achieved
- Missed

Internal numeric mapping:
- Achieved = 100
- Partially Achieved = 50
- Missed = 0

### Overall score

Calculated deterministically:

`Universal Score = average of 5 communication skills`

`Overall Score = 70% Universal Score + 30% Scenario Objective Score`

AI must not invent the final overall score.

---

## 9. Coaching Requirements

A successful evaluation must provide:
- five skill scores;
- scenario-objective outcomes;
- concise summary;
- strengths;
- improvement areas;
- important conversation moments;
- explanation of why those moments mattered;
- stronger response suggestions;
- one recommended next focus.

Important feedback must reference real learner turns.

Rules:
- feedback cannot fabricate learner quotes;
- stronger responses must preserve learner intent;
- stronger responses must not invent achievements, numbers, authority, or personal facts;
- invalid transcript references make the evaluation invalid.

---

## 10. Retry and Comparison

Retry means:

> Start a new attempt of the same scenario and same difficulty by default.

Prior attempts remain immutable.

Comparison should show:
- overall score change;
- five-skill changes;
- scenario-objective changes;
- whether previously identified weak areas improved.

Cross-difficulty comparisons may be shown but must not be presented as strictly equivalent.

---

## 11. Progress

Progress is deterministic.

For each skill:

> Average the learner's latest five eligible completed sessions.

If fewer than five exist, use all eligible sessions.

Weakest skill:

> Lowest current skill average.

Scenario recommendations should use fixed skill-to-scenario mappings, not AI.

Deleted, abandoned, failed, and ineligible short sessions do not contribute to progress.

---

## 12. History

Learners must be able to reopen completed attempts and inspect:
- scenario;
- difficulty;
- completion time;
- transcript;
- evaluation;
- score.

History must preserve retry relationships.

---

## 13. Privacy and Security Requirements

Workplace transcripts are sensitive user data.

Release 1 requires:
- users may access only their own attempts/evaluations;
- no transcripts in standard application logs;
- no raw audio persistence;
- no frontend AI secrets;
- no hidden scenario configuration exposed to browser;
- data sent to AI providers limited to what is required;
- users can delete their own stored session data;
- expensive AI operations are rate-limited;
- structured AI outputs are runtime-validated.

---

## 14. P0 — Release Blocking

Must ship:
- authentication;
- six curated scenarios;
- Easy / Medium / Hard;
- text simulation;
- push-to-talk transcription;
- adaptive AI roleplay;
- optional non-blocking TTS;
- session lifecycle;
- structured evaluation;
- five communication skill scores;
- scenario objectives;
- evidence-linked coaching;
- stronger-response examples;
- retry;
- attempt comparison;
- history;
- progress;
- session deletion;
- responsive/error/loading states;
- AI timeout/failure handling;
- authorization;
- rate limiting;
- production-safe logging.

---

## 15. P1 — Only After P0 Is Stable

- additional curated scenarios;
- richer progress charts;
- onboarding/tutorial;
- more TTS voice choices;
- minor speaking metrics if cheap/reliable;
- deeper attempt-comparison presentation.

---

## 16. P2 / Post-MVP

Do not implement during Release 1:
- Arabic or multilingual support;
- custom/user-generated scenarios;
- realtime speech-to-speech;
- avatars/video;
- live meeting analysis;
- multiplayer;
- teams;
- enterprise dashboards;
- billing;
- courses;
- certificates;
- community/social features;
- advanced gamification;
- browser extensions;
- mobile-native app;
- advanced AI personalization.

---

## 17. Core Failure Behavior

The product must recover safely from:
- AI roleplay timeout/failure;
- malformed AI response;
- microphone permission denial;
- upload/transcription failure;
- empty transcription;
- TTS failure;
- duplicate submission;
- duplicate finish request;
- invalid evaluation;
- evaluation provider failure;
- invalid transcript references;
- session limits;
- unauthorized resource access.

No supported failure should silently lose an accepted learner message.

---

## 18. Release 1 Acceptance Criteria

Release 1 is functionally complete when an authenticated learner can:

1. choose any of the six scenarios;
2. understand their objective;
3. select difficulty;
4. start a simulation;
5. practice through text;
6. practice through push-to-talk;
7. fall back to text if voice fails;
8. receive context-aware AI responses;
9. experience meaningful difficulty differences;
10. finish explicitly;
11. receive valid structured evaluation;
12. see all five skill scores;
13. see scenario-objective outcomes;
14. inspect evidence-linked feedback;
15. see stronger alternatives;
16. identify one next focus;
17. retry;
18. compare attempts;
19. view session history;
20. view skill progress;
21. delete their own session;
22. never access another learner's private data;
23. recover from supported AI/voice failures without losing the whole session.

If this loop is not stable, Release 1 is not done.

---

## 19. Current Development Priority

First vertical slice:

`Auth → Salary Negotiation / Medium → Text Conversation → Finish → Evaluation → Persisted Results`

Do not begin voice, TTS, history, progress, retry comparison, or the remaining scenarios until this slice works end-to-end.
