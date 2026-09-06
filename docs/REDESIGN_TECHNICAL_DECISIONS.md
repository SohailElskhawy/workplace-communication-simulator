# Redesign technical reconciliation

Date: September 6, 2026. This document separates verified source facts from approved targets and pending implementation decisions. It overrides conflicting historical statements only for the topics listed here. It does not claim the redesign is deployed.

## Current source baseline

- `packages/contracts/src/attempt.ts` supports `language: en | ar`, `dialect: EGYPTIAN | GULF`, and `PUSH_TO_TALK | REALTIME`. Request dialect defaults to EGYPTIAN; domain persistence must normalize English to null. Read/create DTOs expose language/dialect.
- `prisma/schema.prisma` has attempt language/dialect columns and retains InteractionMode.REALTIME. RealtimeConversation is absent. Do not recreate its obsolete table/routes from historical docs.
- `apps/web/src/hooks/use-continuous-live-call.ts` and `live-call-stage.tsx` implement an internal continuous-call flow using transcription and normal turn calls. Audit support before changing mode selection.
- `apps/api/src/modules/tts/edge-tts-provider.ts` implements backend Edge TTS with English, Egyptian and Gulf voice selection. Older Kokoro/OpenRouter-only TTS requirements are superseded by the September 5 implementation. OpenRouter remains the boundary for roleplay, evaluation, transcription and custom generation; no generic fallback/provider orchestration is approved.
- `apps/api/src/modules/entitlements/entitlement-service.ts` computes usage in a rolling seven-day window. `windowEndsAt` equals the time of observation, not a reset timestamp. Plans are still modeled; targeted source review did not find the documented custom-generation plan check in scenario service. Full route-level testing remains necessary.
- `apps/api/src/modules/ai/evaluation-prompt.ts` has no explicit feedback language in EvaluationPromptInput. Full bilingual coaching cannot be assumed merely from roleplay language support.

## Approved testing access target — M03

All authenticated testers can use curated and custom interviews, with three combined simulation starts per rolling seven days. Enforce on the backend, including testers carrying historical PLUS/PRO values, without wiping plan records. Retain existing ledger, atomic enforcement, rate limits, ownership, validation and privacy. Failed-turn/evaluation recovery is not a new attempt; retry is. Generating a scenario is not a simulation start. Deletion never restores capacity. No payment/upgrade prompts in testing.

No new migration is required solely to make custom interviews free. Decide a minimal explicit server-side testing policy during M03; do not weaken backend checks or silently change launch plans.

If displaying exact next availability, add a documented server-derived nullable field to the entitlement contract before coding it. Derive from immutable ledger entries and effective limit, including historical counts above the limit and inclusive boundary behavior. Do not guess a weekly reset from client history or `windowEndsAt`. Existing error codes remain stable; expose safe localized UI copy from codes.

## Bilingual presentation and generated content — M02/M03/M06

Interface locale and practice language are distinct concepts. User-approved interface Arabic is friendly Modern Standard Arabic; conversation dialect remains explicit. Proposed default: generated coaching follows the attempt language, while surrounding labels follow interface locale. Finalize this policy before altering prompts/contracts. Never retranslate canonical stored learner text or regenerate scores on a language switch.

Public titles/context, objectives, custom review summaries, error states, and feedback require coverage. Decide versioned localized public metadata and fallbacks in M03; return only allowed public DTO fields. Changing hidden behavioral definitions requires new scenario versions. Existing history remains valid. Evaluation receives explicit language context, uses validated structure and actual turn IDs, and avoids unsupported learner facts in both languages.

Preserve deterministic `round(0.70 * universalScore + 0.30 * scenarioScore)`, discrete objective mapping, and latest-five eligible progress. Mockup scores and numeric suggested raises are illustrative and may not be internally consistent with a real stored evaluation; they are not fixtures. Production stronger-response suggestions cannot invent numbers or achievements absent from evidence.

## Portrait and call presentation — M05

Static fictional portraits are an approved exception to the original no-avatar scope. Use versioned bundled static assets with safe public persona display mapping, fixed per curated scenario and default custom interviewer. Match name/role/voice using already public data or an explicitly reviewed DTO, never by shipping hidden persona JSON. Preserve stable identity for the attempt; choose deterministic historical fallback and document asset replacement behavior.

No per-session image generation, uploaded learner pictures, camera access, video, animated character, lip-sync, object storage or new realtime provider is implied. The call appearance reuses current turn lifecycle. PTT activation stops and aborts current speech playback; late audio responses cannot restart it. Accepted text and one-pending-turn/idempotency invariants remain authoritative.

## Persistence and migrations

Retain User plan fields, PracticeUsageLedger, scenario ownership/versioning and attempt language/dialect. The visual redesign alone does not require a migration. Only add fields for a demonstrated persistence need (for example approved locale or stable identity metadata) after documenting migration/backfill and historical behavior. Never hold database transactions over AI/network calls. No new infrastructure or major dependencies without a concrete need.

## Historical documents

The old ElevenLabs API section and RealtimeConversation database section describe removed infrastructure. Older OpenRouter-only/Kokoro TTS passages and English-only/custom-plan/animated-avatar exclusions do not override this reconciliation or the approved redesign. Retain other security, lifecycle, scoring, structured-output and privacy rules. Future milestone commits should replace obsolete detailed examples when the corresponding current DTOs are verified.
