# Custom Voice Architecture with Edge-TTS & Arabic Support

- **Date:** 2026-09-05
- **Status:** Approved
- **Scope:** Full-stack (`packages/contracts`, `prisma`, `apps/api`, `apps/web`)

---

## 1. Problem Statement & Motivation

1. **ElevenLabs Vendor Cost Trap:**  
   The experimental realtime voice spike in Kalemny relied on ElevenLabs Conversational AI, charging $0.08–$0.15+ per minute of voice conversation (~$0.60–$0.90 per 6-minute simulation). Under Kalemny's plan structure (Free: 3 sims/week, Plus: $15/mo for 15 sims/week, Pro: $29/mo unlimited), ElevenLabs generated a negative gross margin on every active user, threatening product viability.
2. **Lack of Arabic Language Support:**  
   The current product is English-only. The Arab world (MENA/GCC) is an underserved, high-willingness-to-pay market for workplace negotiation and interview practice. Basic open-source TTS models (e.g. Kokoro or Piper) either lack Arabic or fail on Arabic diacritization (Tashkeel).
3. **Architectural Coherence & Privacy:**  
   ElevenLabs required sending entire persona briefs and conversation transcripts to a third-party cloud. Kalemny's core invariants require that hidden persona/rubric data never leaves the controlled boundary, and that raw audio is never permanently stored.

---

## 2. Solution Overview

We implement **Option A: Custom In-House Voice Pipeline with Edge-TTS & OpenRouter**:
1. **Clean Replacement of ElevenLabs:** Remove all ElevenLabs SDKs, server endpoints, webhooks, and database tables.
2. **Unified Conversation Stage:** Enhance the existing Conversation Mode into a single, high-performance voice experience supporting both English and Arabic.
3. **Zero-Cost High-Fidelity Speech Synthesis:** Introduce an internal `EdgeTtsProvider` using Microsoft Edge's neural voice engine:
   - **$0 per simulation** for TTS.
   - Studio-quality neural voices in **Egyptian Arabic (`ar-EG`)**, **Gulf Arabic (`ar-SA`)**, and **English (`en-US`)**.
   - Contextual Harakaat (diacritization) automatically handled by Microsoft's neural linguistic engine.
4. **Bilingual Practice Support:**
   - Learners can toggle between English (`en`) and Arabic (`ar`) on the scenario setup screen.
   - For Arabic, Egyptian dialect is selected by default, with an optional Gulf dialect toggle.
   - Curated Arabic opening messages in scenario definitions provide instantaneous, culturally authentic openings with zero extra LLM translation overhead.
5. **Decoupled Audio Turn Flow:**
   - Audio is transcribed via Whisper Large v3 Turbo on OpenRouter.
   - Roleplay text is generated via OpenRouter (`deepseek/deepseek-chat` for English, `qwen/qwen-2.5-72b-instruct` or DeepSeek for Arabic).
   - The completed turn is persisted to PostgreSQL, and the frontend immediately requests the synthesized audio from the authenticated turn-speech endpoint for seamless playback through the stage orb.

---

## 3. Detailed Specifications

### 3.1 Data Contracts (`packages/contracts`)

Update `@kalemny/contracts`:

1. **Language & Dialect Types:**
   ```typescript
   export const SupportedLanguageSchema = z.enum(["en", "ar"]);
   export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

   export const ArabicDialectSchema = z.enum(["EGYPTIAN", "GULF"]);
   export type ArabicDialect = z.infer<typeof ArabicDialectSchema>;
   ```

2. **Attempt Requests & Responses:**
   ```typescript
   export const CreateAttemptRequestSchema = z.strictObject({
     scenarioKey: z.string().trim().min(1),
     difficulty: DifficultySchema,
     language: SupportedLanguageSchema.optional().default("en"),
     dialect: ArabicDialectSchema.optional().default("EGYPTIAN"),
     retryOfAttemptId: ResourceIdSchema.nullable().optional().default(null),
   });

   export const CreateAttemptResponseSchema = z.strictObject({
     data: z.strictObject({
       id: ResourceIdSchema,
       status: z.literal("ACTIVE"),
       difficulty: DifficultySchema,
       language: SupportedLanguageSchema,
       dialect: ArabicDialectSchema.nullable().optional(),
       scenario: AttemptScenarioSchema,
       openingMessage: z.string().min(1),
       startedAt: TimestampSchema,
       expiresAt: TimestampSchema,
     }),
   });

   export const AttemptDetailResponseSchema = z.strictObject({
     data: z.strictObject({
       id: ResourceIdSchema,
       status: AttemptStatusSchema,
       difficulty: DifficultySchema,
       language: SupportedLanguageSchema,
       dialect: ArabicDialectSchema.nullable().optional(),
       scenario: AttemptScenarioSchema,
       retryOfAttemptId: ResourceIdSchema.nullable(),
       turns: z.array(ConversationTurnSchema),
       evaluation: EvaluationDataSchema.nullable(),
       comparison: AttemptComparisonSchema.nullable().optional().default(null),
       startedAt: TimestampSchema,
       endedAt: TimestampSchema.nullable(),
       expiresAt: TimestampSchema,
     }),
   });
   ```

3. **InteractionMode Deprecation:**
   Remove `REALTIME` from `InteractionModeSchema` (the application now features one standard conversational mode with push-to-talk/auto-silence and speech playback).

---

### 3.2 Database Schema (`prisma/schema.prisma`)

1. **Add Language & Dialect to `SimulationAttempt`:**
   ```prisma
   model SimulationAttempt {
     id                  String          @id @default(uuid()) @db.Uuid
     userId              String          @db.Uuid
     scenarioId          String          @db.Uuid
     difficulty          Difficulty
     language            String          @default("en") @db.VarChar(10)
     dialect             String?         @db.VarChar(20)
     status              AttemptStatus   @default(ACTIVE)
     // ... other existing fields ...
   }
   ```

2. **Remove `RealtimeConversation` Table:**
   Drop the `RealtimeConversation` model via a Prisma migration.

---

### 3.3 Backend AI & TTS Architecture (`apps/api`)

#### 1. Internal `TtsProvider` (`apps/api/src/modules/tts/tts-provider.ts`)
```typescript
export interface GenerateSpeechOptions {
  text: string;
  language: "en" | "ar";
  dialect?: "EGYPTIAN" | "GULF" | null;
  gender?: "MALE" | "FEMALE";
  timeoutMs: number;
}

export interface SpeechResult {
  audio: Buffer;
  contentType: string;
  latencyMs: number;
}

export interface TtsProvider {
  generateSpeech(options: GenerateSpeechOptions): Promise<SpeechResult>;
}
```

#### 2. Edge-TTS Provider Implementation (`apps/api/src/modules/tts/edge-tts-provider.ts`)
- Implements `TtsProvider` using `msedge-tts` (or equivalent direct protocol client).
- **Voice Resolution Matrix:**
  - Arabic + EGYPTIAN + Female $\rightarrow$ `ar-EG-SalmaNeural`
  - Arabic + EGYPTIAN + Male $\rightarrow$ `ar-EG-ShakirNeural`
  - Arabic + GULF + Female $\rightarrow$ `ar-SA-ZariyahNeural`
  - Arabic + GULF + Male $\rightarrow$ `ar-SA-HamedNeural`
  - English + Female $\rightarrow$ `en-US-JennyNeural`
  - English + Male $\rightarrow$ `en-US-GuyNeural`
- **Text Sanitization:** Strips stage annotations (e.g. `*sighs*`, `[pause]`) prior to speech synthesis.
- **Audio Output:** Streams 24kHz/48kbps MP3 audio buffer (`audio/mpeg`).

#### 3. Scenario Localization
In `apps/api/src/modules/scenarios/definitions/`:
- Add `openingMessageAr` to all scenario definitions and variations.
- Example (`salary-negotiation-v2.ts`):
  ```typescript
  {
    id: "budget-cap",
    category: "BUDGET_CONSTRAINT",
    openingMessage: "Thanks for making time. I want to be upfront before you make your case: the band for this role was approved near the top of our range...",
    openingMessageAr: "شكراً لوقتك. حابب أكون صريح معاك من البداية: الراتب المعروض قريب جداً من الحد الأقصى للنطاق المحدد للوظيفة دي، ومع ذلك حابب أسمع وجهة نظرك وتوقعاتك.",
    counterpartBrief: "..."
  }
  ```

#### 4. OpenRouter Prompt & Arabic Roleplay
- In `roleplay-prompt.ts`: When `attempt.language === "ar"`, the system prompt instructs the counterpart to respond in fluent, professional colloquial Arabic (Egyptian or Gulf, according to `attempt.dialect`), maintaining natural workplace tone and idioms.
- Preferred Arabic roleplay model: `qwen/qwen-2.5-72b-instruct` or `deepseek/deepseek-chat`.

---

### 3.4 Frontend UI & User Experience (`apps/web`)

1. **Scenario Setup (`/app/scenarios/[scenarioKey]`):**
   - Renders a clean segmented control:
     - **English (`en`)**
     - **العربية (`ar`)**
   - If Arabic is selected, an accessible sub-toggle offers:
     - **مصري (Egyptian)** — default
     - **خليجي (Gulf)**
   - Submits `language` and `dialect` in `POST /api/v1/attempts`.

2. **Simulation Stage (`/app/simulations/[attemptId]`):**
   - Renders with `dir="rtl"` when `language === "ar"`.
   - Composer handles Arabic audio transcription with language hinting.
   - Assistant speech plays automatically through the existing Orb visualizer.
   - Text fallback and transcript drawer fully support Arabic RTL text.

3. **Cleanup of ElevenLabs:**
   - Remove `@elevenlabs/react` from `package.json`.
   - Delete `apps/web/src/components/simulations/live-conversation.tsx`.
   - Remove ElevenLabs webhook routes, provider files, and configuration.

---

## 4. Architectural Invariants Preserved

1. **Zero Audio Persistence:** Raw user audio and generated assistant speech are never saved to disk or PostgreSQL.
2. **Deterministic Ownership & State:** Attempt lifecycle, turn sequencing, and atomic claims remain strictly server-authoritative.
3. **Non-Blocking TTS:** A failure during speech generation never fails or corrupts the conversation turn; the learner can always read the text transcript and continue.
4. **Data Privacy:** Scenarios, personas, and transcripts are never sent to ElevenLabs or third-party audio clouds.

---

## 5. Implementation Phases

1. **Phase 1: Contracts & Database Migration**
   - Add `language` and `dialect` fields to Prisma schema.
   - Remove `RealtimeConversation` table.
   - Update `@kalemny/contracts` and run tests.
2. **Phase 2: Backend Edge-TTS Integration**
   - Implement `EdgeTtsProvider` with voice mapping and text sanitization.
   - Update `TtsService` to use the new provider.
   - Add localized Arabic opening messages to scenario definitions.
   - Update roleplay prompt for Arabic language instruction.
3. **Phase 3: Frontend UI & Cleanup**
   - Add Language & Dialect selectors to Scenario Setup page.
   - Add RTL support to the simulation conversation stage.
   - Remove all ElevenLabs files, dependencies, and environment variables.
4. **Phase 4: Automated Testing & Verification**
   - Unit and integration tests for Edge-TTS provider, Arabic turn creation, and scenario setup.
   - Full lint, typecheck, and test suite execution.
