# Custom Voice Architecture & Arabic Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ElevenLabs with an internal zero-cost Edge-TTS engine, add full Arabic language (`ar`) and dialect support (`EGYPTIAN` and `GULF`), and enable bilingual workplace simulations across Kalemny.

**Architecture:** A custom in-house voice pipeline where OpenRouter handles Whisper STT and LLM roleplay completions, while an internal `EdgeTtsProvider` synthesizes studio-quality neural voices in Arabic and English at $0 cost with automatic contextual Tashkeel (diacritization). ElevenLabs dependencies, webhooks, and database tables are cleanly removed.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod, OpenRouter (Whisper & Qwen 2.5/DeepSeek), `msedge-tts`, Next.js, Tailwind CSS, TanStack Query.

## Global Constraints

- Strict TypeScript; zero `any` unless unavoidable and explicitly documented.
- Zero audio persistence to disk or database (invariants 13, 15, 16).
- Centralized error handling; non-blocking TTS failure (TTS failure must never block the text experience or drop accepted turns).
- Deterministic scoring, turn sequencing, and attempt lifecycle remain server-authoritative.
- DO NOT WORK WITH TDD (implement feature first, then write/run verification tests).

---

### Task 1: Contracts & Database Migration (Language/Dialect Support & ElevenLabs Removal)

**Files:**
- Modify: `packages/contracts/src/attempt.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/attempt.test.ts`
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: Existing attempt schemas and Prisma models.
- Produces: `SupportedLanguageSchema` (`"en" | "ar"`), `ArabicDialectSchema` (`"EGYPTIAN" | "GULF"`), updated `CreateAttemptRequestSchema` and attempt detail response schemas. Drops `RealtimeConversation` model from schema.

- [ ] **Step 1: Update `@kalemny/contracts` with Language and Dialect schemas**

In `packages/contracts/src/attempt.ts`:
```typescript
export const SupportedLanguageSchema = z.enum(["en", "ar"]);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const ArabicDialectSchema = z.enum(["EGYPTIAN", "GULF"]);
export type ArabicDialect = z.infer<typeof ArabicDialectSchema>;
```
Update `CreateAttemptRequestSchema`:
```typescript
export const CreateAttemptRequestSchema = z.strictObject({
  scenarioKey: z.string().trim().min(1),
  difficulty: DifficultySchema,
  language: SupportedLanguageSchema.optional().default("en"),
  dialect: ArabicDialectSchema.optional().default("EGYPTIAN"),
  retryOfAttemptId: ResourceIdSchema.nullable().optional().default(null),
  interactionMode: InteractionModeSchema.optional().default("PUSH_TO_TALK"),
});
```
Update `CreateAttemptResponseSchema` and `AttemptDetailResponseSchema` to include `language` and optional `dialect`. Export them from `packages/contracts/src/index.ts`.

- [ ] **Step 2: Update contracts unit tests and build contracts**

In `packages/contracts/src/attempt.test.ts`, add test cases validating `language` and `dialect` defaults and validation.
Run:
```bash
corepack pnpm --filter @kalemny/contracts test
corepack pnpm --filter @kalemny/contracts build
```
Expected: All contract tests PASS and build succeeds.

- [ ] **Step 3: Update `prisma/schema.prisma` and generate migration**

In `prisma/schema.prisma`:
1. Add to `SimulationAttempt`:
```prisma
  language            String          @default("en") @db.VarChar(10)
  dialect             String?         @db.VarChar(20)
```
2. Remove `realtimeConversations RealtimeConversation[]` relation from `SimulationAttempt`.
3. Drop `model RealtimeConversation`.

Run:
```bash
corepack pnpm --filter database prisma migrate dev --name add_language_and_remove_elevenlabs
```
Expected: Migration generated and applied to the database, Prisma client regenerated.

- [ ] **Step 4: Commit Task 1**

```bash
git add packages/contracts prisma
git commit -m "feat: add language and dialect to attempt contracts and schema, drop RealtimeConversation"
```

---

### Task 2: Internal Edge-TTS Engine (`EdgeTtsProvider` & `TtsService`)

**Files:**
- Modify: `apps/api/package.json` (install `msedge-tts`)
- Create: `apps/api/src/modules/tts/tts-provider.ts`
- Create: `apps/api/src/modules/tts/edge-tts-provider.ts`
- Create: `apps/api/src/modules/tts/edge-tts-provider.test.ts`
- Modify: `apps/api/src/modules/tts/tts-service.ts`
- Modify: `apps/api/src/modules/tts/prisma-tts-repository.ts`
- Modify: `apps/api/src/modules/tts/tts-repository.ts`
- Modify: `apps/api/src/modules/tts/tts-service.test.ts`

**Interfaces:**
- Consumes: `TtsProvider` interface with `generateSpeech(options)`.
- Produces: Synthesis of MP3 audio buffers for Arabic (`ar-EG-SalmaNeural`, `ar-EG-ShakirNeural`, `ar-SA-ZariyahNeural`, `ar-SA-HamedNeural`) and English (`en-US-JennyNeural`, `en-US-GuyNeural`) with non-blocking error handling.

- [ ] **Step 1: Install `msedge-tts` in `apps/api`**

Run:
```bash
corepack pnpm --filter @kalemny/api add msedge-tts
```

- [ ] **Step 2: Create `tts-provider.ts` interface**

Create `apps/api/src/modules/tts/tts-provider.ts`:
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

- [ ] **Step 3: Implement `EdgeTtsProvider`**

Create `apps/api/src/modules/tts/edge-tts-provider.ts`:
1. Clean stage annotations from text (`*sighs*`, `[pause]`, `(hesitates)`).
2. Resolve voice name deterministically:
   - `language === "ar"` and `dialect === "GULF"`: Female $\rightarrow$ `ar-SA-ZariyahNeural`, Male $\rightarrow$ `ar-SA-HamedNeural`.
   - `language === "ar"` and `dialect === "EGYPTIAN"` (default): Female $\rightarrow$ `ar-EG-SalmaNeural`, Male $\rightarrow$ `ar-EG-ShakirNeural`.
   - `language === "en"`: Female $\rightarrow$ `en-US-JennyNeural`, Male $\rightarrow$ `en-US-GuyNeural`.
3. Use `MsEdgeTTS` with output format `audio-24khz-48kbitrate-mono-mp3` and a strict timeout with `AbortController`.
4. Return `{ audio: Buffer, contentType: "audio/mpeg", latencyMs }`.

- [ ] **Step 4: Update `TtsService` and `TtsRepository`**

1. In `tts-repository.ts` & `prisma-tts-repository.ts`:
   - Extend `findOwnedSpeechTurn` to return `language`, `dialect`, and counterpart persona role/gender.
2. In `tts-service.ts`:
   - Inject `TtsProvider` instead of relying on `AiService.generateSpeech`.
   - Invoke `ttsProvider.generateSpeech(...)` with attempt language, dialect, and persona gender.
   - Record usage telemetry and preserve non-blocking `TTS_FAILED` error isolation.

- [ ] **Step 5: Write and run unit tests for `EdgeTtsProvider` & `TtsService`**

Create `apps/api/src/modules/tts/edge-tts-provider.test.ts` and update `apps/api/src/modules/tts/tts-service.test.ts`.
Run:
```bash
corepack pnpm --filter @kalemny/api test src/modules/tts
```
Expected: All TTS unit tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add apps/api
git commit -m "feat: implement in-house EdgeTtsProvider supporting Arabic and English neural voices"
```

---

### Task 3: Backend Arabic Scenarios & Roleplay Prompt Integration

**Files:**
- Modify: `apps/api/src/modules/scenarios/scenario-definition.ts`
- Modify: `apps/api/src/modules/scenarios/definitions/salary-negotiation-v2.ts` (and other v2 definitions)
- Modify: `apps/api/src/modules/attempts/attempt-service.ts`
- Modify: `apps/api/src/modules/attempts/attempt-routes.ts`
- Modify: `apps/api/src/modules/ai/roleplay-prompt.ts`
- Modify: `apps/api/src/modules/ai/roleplay-prompt.test.ts`
- Modify: `apps/api/src/modules/attempts/attempt-service.test.ts`

**Interfaces:**
- Consumes: `openingMessageAr` on scenario definitions, `language` and `dialect` on `CreateAttemptRequest`.
- Produces: Bilingual attempt creation, Arabic system prompts for OpenRouter roleplay, and localized opening messages.

- [ ] **Step 1: Add `openingMessageAr` to scenario definition schemas**

In `apps/api/src/modules/scenarios/scenario-definition.ts`:
Add `openingMessageAr: z.string().min(1).optional()` to `ScenarioVariationSchema` and `ScenarioDefinitionSchema`.

- [ ] **Step 2: Add curated Arabic opening messages to scenario definitions**

In `apps/api/src/modules/scenarios/definitions/*.ts`:
Provide authentic Egyptian Arabic opening messages for each scenario variation (e.g. Salary Negotiation, Behavioral Interview, Difficult Feedback).

- [ ] **Step 3: Update `attempt-service.ts` to persist language & dialect and resolve Arabic opening**

In `attempt-service.ts`:
- When creating an attempt: persist `language: input.language ?? "en"` and `dialect: input.dialect ?? "EGYPTIAN"`.
- When `language === "ar"`: use `variation.openingMessageAr ?? scenario.openingMessageAr ?? scenario.openingMessage` as the initial counterpart opening message.
- Return `language` and `dialect` in attempt response records.

- [ ] **Step 4: Update `roleplay-prompt.ts` for Arabic roleplay instructions**

In `apps/api/src/modules/ai/roleplay-prompt.ts`:
When `attempt.language === "ar"`, inject the system directive:
- Instruct the counterpart to conduct the dialogue strictly in professional colloquial Arabic (Egyptian dialect by default, or Gulf dialect if specified).
- Maintain natural workplace idioms and conversational pacing while adhering strictly to the scenario's hidden objectives and difficulty behavior.

- [ ] **Step 5: Run tests for scenarios, attempts, and prompts**

Run:
```bash
corepack pnpm --filter @kalemny/api test src/modules/scenarios src/modules/attempts src/modules/ai
```
Expected: All tests PASS.

- [ ] **Step 6: Commit Task 3**

```bash
git add apps/api
git commit -m "feat: add Arabic opening messages and roleplay prompt localization"
```

---

### Task 4: Complete Backend Cleanup of ElevenLabs

**Files:**
- Delete: `apps/api/src/modules/realtime/elevenlabs-provider.ts` & `elevenlabs-provider.test.ts`
- Delete: `apps/api/src/modules/realtime/elevenlabs-webhook.ts` & `elevenlabs-webhook.test.ts`
- Delete or Modify: `apps/api/src/modules/realtime/realtime-routes.ts`
- Modify: `apps/api/src/config/env.ts` & `env.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Consumes: Removal of ElevenLabs configuration and routes.
- Produces: Streamlined API server free of third-party live audio dependencies.

- [ ] **Step 1: Remove ElevenLabs environment variables**

In `apps/api/src/config/env.ts` and `.env.example`:
Remove `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_TOOL_SECRET`, and `ELEVENLABS_WEBHOOK_SECRET`.
Update `apps/api/src/config/env.test.ts`.

- [ ] **Step 2: Delete ElevenLabs provider and webhook files**

Delete the provider, webhook, and test files under `apps/api/src/modules/realtime/`. Remove webhook endpoints and route mounting in `apps/api/src/server.ts`.

- [ ] **Step 3: Run API test suite**

Run:
```bash
corepack pnpm --filter @kalemny/api test
corepack pnpm --filter @kalemny/api typecheck
```
Expected: 100% clean test suite and typecheck with zero ElevenLabs references.

- [ ] **Step 4: Commit Task 4**

```bash
git add apps/api .env.example
git commit -m "refactor: cleanly remove ElevenLabs backend provider, webhooks, and env config"
```

---

### Task 5: Frontend Scenario Setup Screen (Bilingual & Dialect Controls)

**Files:**
- Modify: `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx`
- Modify: `apps/web/src/lib/api-client.ts`

**Interfaces:**
- Consumes: `CreateAttemptRequest` accepting `language` and `dialect`.
- Produces: User-facing interactive Language selector (English / Arabic) and Dialect selector (Egyptian / Gulf).

- [ ] **Step 1: Update `api-client.ts`**

In `apps/web/src/lib/api-client.ts`:
Update `createAttempt` arguments and response types to support `language?: "en" | "ar"` and `dialect?: "EGYPTIAN" | "GULF"`.

- [ ] **Step 2: Add Language & Dialect controls to Scenario Setup Page**

In `apps/web/src/app/app/scenarios/[scenarioKey]/page.tsx`:
1. Remove the experimental Realtime mode toggle.
2. Add a Neo-Brutalist segmented button group for Language:
   - `English` (`en`)
   - `العربية` (`ar`)
3. When `العربية` is selected, display the Dialect radio/segmented control:
   - `لهجة مصرية (Egyptian)` — default
   - `لهجة خليجية (Gulf)`
4. Pass selected `language` and `dialect` to `createAttemptMutation`.

- [ ] **Step 3: Verify setup page in web build**

Run:
```bash
corepack pnpm --filter @kalemny/web build
```
Expected: Build succeeds without TypeScript errors.

- [ ] **Step 4: Commit Task 5**

```bash
git add apps/web
git commit -m "feat: add bilingual and dialect selection controls to scenario setup screen"
```

---

### Task 6: Frontend Simulation Stage (Arabic RTL & Audio Playback) & Cleanup

**Files:**
- Modify: `apps/web/src/app/app/simulations/[attemptId]/page.tsx`
- Modify: `apps/web/src/components/simulations/simulation-composer.tsx`
- Delete: `apps/web/src/components/simulations/live-conversation.tsx`
- Modify: `apps/web/package.json` (uninstall `@elevenlabs/react`)

**Interfaces:**
- Consumes: `attempt.language` and `attempt.dialect`.
- Produces: Seamless Arabic RTL rendering on the stage and transcript drawer, push-to-talk STT with Arabic language hint, automatic audio playback via Edge-TTS, and removal of `@elevenlabs/react`.

- [ ] **Step 1: Uninstall `@elevenlabs/react` and delete `live-conversation.tsx`**

Run:
```bash
corepack pnpm --filter @kalemny/web remove @elevenlabs/react
```
Delete `apps/web/src/components/simulations/live-conversation.tsx`.

- [ ] **Step 2: Update Simulation Page for Arabic Support & RTL**

In `apps/web/src/app/app/simulations/[attemptId]/page.tsx`:
1. Remove all references to `LiveConversation` and `interactionMode === "REALTIME"`.
2. Inspect `attempt.language`:
   - If `"ar"`, apply `dir="rtl"` to the stage container and transcript drawer with appropriate font classes.
3. Pass `language: attempt.language` to `SimulationComposer` so speech-to-text uses the appropriate language hint when sending audio to the API.
4. Auto-play assistant speech upon completed turns using the existing audio player and stage orb.

- [ ] **Step 3: Run web unit tests and production build**

Run:
```bash
corepack pnpm --filter @kalemny/web test
corepack pnpm --filter @kalemny/web build
```
Expected: All web tests PASS and production Next.js build succeeds cleanly.

- [ ] **Step 4: Commit Task 6**

```bash
git add apps/web
git commit -m "feat: add Arabic RTL support to simulation stage and remove @elevenlabs/react"
```

---

### Task 7: Full Monorepo Verification & Documentation

**Files:**
- Modify: `docs/PROJECT_STATE.md`

- [ ] **Step 1: Run full verification across the entire monorepo**

Run:
```bash
corepack pnpm check
corepack pnpm lint
corepack pnpm test
```
Expected: 100% clean typecheck, 0 lint warnings/errors, all unit and integration tests passing.

- [ ] **Step 2: Update `docs/PROJECT_STATE.md`**

Record the completed transition:
- Document Milestone: In-house Edge-TTS voice engine and bilingual Arabic/English support.
- Note the complete deprecation and removal of ElevenLabs.
- Update test count and verified status.

- [ ] **Step 3: Final Commit**

```bash
git add docs/PROJECT_STATE.md
git commit -m "docs: update PROJECT_STATE.md with custom voice architecture and Arabic support"
```
