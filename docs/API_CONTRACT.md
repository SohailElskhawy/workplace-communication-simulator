# API_CONTRACT.md

## 1. Base Contract & Authentication
- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <Clerk JWT>` on all private endpoints. Non-owned resources return `404 NOT_FOUND`.
- Envelope:
  - Success: `{ "data": { ... } }`
  - Error: `{ "error": { "code": "ERROR_CODE", "message": "Safe client message", "requestId": "..." } }`
- Common HTTP Statuses: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 429 (Rate Limited), 500 (Internal Error), 502 (Bad Gateway / AI Failed), 504 (Gateway Timeout).

## 2. Stable Error Codes
- Auth: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `USER_NOT_FOUND` (404)
- Validation: `VALIDATION_ERROR` (400), `INVALID_DIFFICULTY` (400), `INVALID_LANGUAGE` (400), `INVALID_DIALECT` (400)
- Attempt Lifecycle: `ATTEMPT_NOT_FOUND` (404), `INVALID_ATTEMPT_STATE` (409), `TURN_LIMIT_REACHED` (409), `SESSION_LIMIT_REACHED` (409), `EVALUATION_IN_PROGRESS` (409)
- Turn & AI: `TURN_NOT_FOUND` (404), `CONCURRENT_TURN_PENDING` (409), `ROLEPLAY_FAILED` (502), `ROLEPLAY_TIMEOUT` (504), `EVALUATION_FAILED` (502), `EVALUATION_TIMEOUT` (504), `TRANSCRIPTION_FAILED` (502), `TTS_FAILED` (502)
- Entitlements: `RATE_LIMITED` (429), `PLAN_LIMIT_REACHED` (403)

## 3. Endpoints

### User & Profile
- `GET /me` → Returns authenticated User profile (`id`, `plan`, `planExpiresAt`, `entitlements`).

### Scenarios
- `GET /scenarios` → List active scenarios (curated + user's custom scenarios).
- `GET /scenarios/:scenarioKey` → Get public scenario details (context, roles, objectives, difficulties, openingMessage, openingMessageAr).
- `POST /scenarios/custom` → Generate owner-scoped interview from CV PDF + Job Description (`multipart/form-data`: `cv` file up to 5MB, `jobDescription` string).

### Simulation Attempts
- `POST /attempts` → Create and start a simulation attempt.
  - Body: `{ scenarioKey, difficulty, language, dialect?, interactionMode? }`
  - Response (201): Attempt metadata, `status: "ACTIVE"`, `openingMessage`.
- `GET /attempts/:attemptId` → Get attempt state, transcript turns, and status.
- `POST /attempts/:attemptId/finish` → Freeze attempt for evaluation (`status: "EVALUATING"`).
- `DELETE /attempts/:attemptId` → Cascade delete attempt and turns (ledger usage preserved).

### Conversation Turns
- `POST /attempts/:attemptId/turns` → Submit learner message and get AI roleplay reply.
  - Body: `{ learnerText: string, inputMethod: "TEXT" | "VOICE", clientTurnId?: string }`
  - Response (201): `{ turn: { id, sequence, learnerText, assistantText, status } }`
- `POST /attempts/:attemptId/turns/:turnId/retry` → Retry roleplay generation on a failed turn.

### Speech & Audio
- `POST /attempts/:attemptId/transcriptions` → In-memory Whisper STT from temporary audio recording.
  - `multipart/form-data`: `audio` file (max 120s, max 25MB).
  - Response (200): `{ transcript: string }` (does NOT create a turn).
- `GET /attempts/:attemptId/turns/:turnId/tts` → Stream synthesized MP3 audio for assistant turn reply.

### Evaluation & Analytics
- `POST /attempts/:attemptId/evaluation` → Trigger structured evaluation if not already completed.
- `GET /attempts/:attemptId/evaluation` → Retrieve persisted evaluation (5 skill scores, objective outcomes, evidence moments, stronger responses).
- `GET /attempts/:attemptId/comparison` → Compare current attempt with its retry source attempt.
- `GET /history` → Paginated list of learner's past attempts with scores.
- `GET /progress` → Rolling progress averages (latest 5 eligible attempts) and skill focus recommendations.
