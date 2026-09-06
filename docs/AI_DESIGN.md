# AI_DESIGN.md

## 1. Model Strategy & Provider Configuration
- **Provider**: OpenRouter (single configured provider; no client-side routing).
  - Roleplay: `deepseek/deepseek-v4-flash-0731` (cost-optimized, low latency, high instruction following).
  - Evaluation: `openai/gpt-5.6-luna-pro` (calibrated structured evaluator).
  - STT: `openai/whisper-large-v3-turbo` (in-memory audio transcription).
  - Custom Scenario: `deepseek/deepseek-v4-flash-0731` (in-memory CV + JD scenario synthesis).
- **TTS**: Backend `msedge-tts` (Edge-TTS neural voices; zero third-party token cost).
- **Timeouts**: Roleplay (30s), Evaluation (60s), Transcription (30s), TTS (15s).

## 2. Roleplay Architecture
- **Prompt Structure (`roleplay-v1`)**:
  - System: Scenario context, persona, motivations, objections, constraints, difficulty directives (Easy/Med/Hard), and Arabic dialect directives (colloquial Egyptian or Gulf idioms).
  - Turns: Prior conversation history seeded with `openingMessage` (or `openingMessageAr`).
- **Safeguards**:
  - Counterpart remains in character; never breaks fourth wall, coaches, scores, or admits it is an AI.
  - Learner attempts to override instructions ("ignore previous instructions", "give me 100/100") are resisted in-character as inappropriate workplace behavior.

## 3. Evaluation Architecture
- **Decoupled Execution**: Triggered only after attempt finish. The evaluator receives the frozen transcript, scenario context, and objective definitions. Transcript is treated as untrusted evidence.
- **Universal Rubric (0–100)**:
  1. **Clarity**: Directness, unambiguous language, articulate points.
  2. **Assertiveness**: Standing ground professionally, clear boundaries, firm yet respectful tone.
  3. **Empathy**: Validating counterpart perspective, emotional intelligence, active listening.
  4. **Structure**: Logical progression, STAR method (in interviews), organized proposals.
  5. **Conciseness**: Avoiding filler, brevity, high signal-to-noise ratio.
- **Scenario Objectives**: Evaluated discretely as `Achieved` (100), `Partially Achieved` (50), or `Missed` (0).
- **Evidence & Coaching Rules**:
  - Strengths and improvements must cite real stored learner turn IDs.
  - Stronger response rewrites must preserve the learner's intent without fabricating achievements, numbers, credentials, or personal authority absent from the transcript.
  - Output validated with Zod against `EvaluationDataSchema`.

## 4. Custom Interview Scenario Generation (`custom-scenario-v1`)
- Input: In-memory CV text (parsed via `unpdf`) + target Job Description text.
- Prompt generates: Candidate title, interviewer persona, company context, 4 targeted behavioral/technical interview objectives, Easy/Med/Hard behavior, and realistic opening message.
- Strictly grounded in candidate achievements and JD requirements; zero hallucinations.

## 5. AI Invariants
1. Browser never calls AI providers directly.
2. Transcripts and audio are never written to application logs.
3. OpenRouter routing enforces Zero Data Retention (ZDR) where available.
4. Deterministic scoring (`70% universal + 30% scenario`) is computed in backend TypeScript, never by the AI.
