# UI and push-to-talk review — September 5, 2026

Status: proposal only. Open `index.html` directly or through a local web server. No application implementation changes are included. Existing uncommitted work was preserved.

## Findings and recommendation

The current Calm Coaching direction has already replaced much of the older visual intensity with light surfaces, softer shadows, and blue accents. Its main remaining problem is inconsistent execution: serif display text, sans body text, and widely spaced monospace labels coexist with small uppercase instructions and multiple competing voice-status areas. A new palette alone will not resolve these interaction problems.

Recommend one system sans-serif family, sentence-case labels, 16–17px conversation/body text, 14px supporting text, approximately 1.6 line height, 44px minimum control targets, quiet neutral surfaces, and a restrained blue primary action. Use numeric tabular alignment for timers rather than monospace across all metadata. The preview offers Arial and serif-heading comparisons. It loads no external fonts, scripts, or services and works offline.

This is a source-based audit. No authenticated production session or real microphone recording was exercised. The existing app was not running on the checked local development ports. The new prototype was inspected in the browser. Do not interpret these findings as observed behavior from usability participants.

## Evidence, and its limits

- [NN/g: Best Font for Online Reading](https://www.nngroup.com/articles/best-font-for-online-reading/) summarizes research showing that the fastest-reading font differs between individuals. Preference and performance do not reliably coincide. It does not establish that system sans, Inter, or any other font is most comfortable for most people.
- [NN/g: Ten Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) supports visible status, familiar conventions, recognition over recall, user control, and optional shortcuts. Applying these principles suggests stable input controls and understandable state labels; the suggested palette remains a design judgment.
- [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) defines WCAG 2.2 AA's 24-by-24 CSS pixel minimum and exceptions, including spacing. This proposal uses 44px as a more generous product target; 44px is not the AA minimum.
- [W3C: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) calls for 4.5:1 ordinary text contrast and 3:1 large-text contrast. Readability, zoom, focus, and target size deserve attention before decorative font changes.

These sources support a defensible starting point, not a claim about a majority preference. Test the actual audience to establish comfort.

## How current push-to-talk works

Owners: `apps/web/src/components/simulations/simulation-composer.tsx`, `apps/web/src/hooks/use-voice-recorder.ts`, `apps/web/src/lib/microphone-silence-detector.ts`, and `apps/web/src/app/app/simulations/[attemptId]/page.tsx`.

1. The attempt has a push-to-talk/realtime interaction mode, but the page's composer starts in TEXT mode. Clicking Push-to-talk both switches to voice and starts recording; there is no additional required click just to select voice.
2. `getUserMedia` requests audio with echo cancellation, noise suppression, and automatic gain control. First-use browser permission is separate from ordinary per-response actions. Browser behavior determines whether subsequent requests prompt again.
3. MediaRecorder buffers audio; a level meter provides recording feedback. Supported encoding is selected from Opus/WebM, WebM, or MP4.
4. Recording stops on Done Speaking, Space release, the 120-second cap, or **1.8 seconds of low microphone level after speech is detected**. This is an amplitude heuristic, not reliable speech understanding.
5. The browser passes the temporary audio to the authenticated API for transcription. The browser does not directly call the AI provider. Transcription is not itself a stored conversation turn.
6. By default, recognized words append to the existing composer draft, the review input receives focus, and Send/Enter submits the response.
7. Turning off Review before sending stores a local preference and submits the transcript directly. This is already implemented and approved in `docs/superpowers/specs/2026-09-05-push-to-talk-enter-to-send-design.md`.
8. Starting the microphone cancels counterpart playback; counterpart speech no longer disables input. Preserve this existing improvement.

| Path | Deliberate actions per response | Other costs |
| --- | --- | --- |
| Tap + review, explicit stop | Start, Stop, Send: 3 activations | Speaking, transcription wait, optional correction |
| Tap + auto-send, explicit stop | Start, Stop: 2 activations | Speaking and transcription wait |
| Hold Space + review | Press/release gesture, then Enter | Maintaining the hold; shortcut discovery |
| Hold Space + auto-send | Press/release gesture | Maintaining the hold; transcription wait |
| Current silence auto-stop + review | Start, Send: 2 activations | Endpoint may be surprising or premature |

First-use permission adds a setup action. Counts exclude scenario choice/start and optional edits. The proposal does not claim fewer taps than the existing auto-stop path: it prioritizes control and predictability.

## Prioritized issues

### High: pauses can prematurely end recording

`SILENCE_AUTO_STOP_MS = 1_800` is used for all recordings, including hold-Space. A learner can pause while thinking and be transcribed before intentionally stopping. With auto-send enabled, this can submit the partial response. Recommendation: stop on explicit click/release or the existing duration cap; do not infer completion from a brief pause. This is a proposed behavior change, not implemented here.

### High: asynchronous permission cancellation needs hardening

`cancelRecording()` cleans existing streams but does not invalidate the pending `getUserMedia()` request. If cancellation occurs during the permission prompt, a later successful resolution can still create a recorder. The same concern applies after unmount. Recommended implementation: session/request generation token, late-stream disposal, and regression coverage. This is a code-derived risk, not a reproduced microphone test.

### High: global keyboard handlers are too broad

The Space handler excludes edit fields but not buttons, links, or dialogs; it can intercept native button activation. Global Enter while a voice draft exists also does not exclude ordinary focused buttons. Scope shortcuts to the composer/microphone, respect dialog focus and modifiers, and handle blur/visibility loss. The preview demonstrates Space on the focused microphone and Enter inside the text box. This narrows today's approved global shortcut behavior and should be reviewed before implementation.

### Medium: recording controls move and compete

The start control becomes disabled during recording while a separate Done Speaking button appears in a banner. Meanwhile the central orb, state description, and footer repeat status. Replace these with one stable status line and a start button that becomes Stop recording in the same location. Keep Cancel secondary and keep the text field present.

### Medium: recovery can lose draft effort

Record again clears the current draft before the next microphone request succeeds. Auto-send submits only the new transcript, bypassing existing typed text. Transcription failure offers an error but no retained-audio retry path; re-recording may be necessary. Preserve the draft, explain the recovery action, avoid truncated error text, and require review when a typed draft already exists. The latter is an explicit proposed refinement to approved auto-send behavior.

### Medium: typography and transcript visibility

`globals.css` defines serif display and monospace metadata; the composer and stage still use 10–12px uppercase labels. The stage uses 12px conversation text on small screens. `conversation-stage.tsx` shows the latest counterpart message in the standard push-to-talk path, with earlier messages behind Transcript. Keep recent learner/counterpart context visible and reduce the status orb's dominance. Preserve full stored transcript access; do not expose hidden rubric data.

## Proposed interaction

Start speaking → recording in the same composer → Stop/release → transcribing → editable draft → Send. Auto-send remains opt-in with an explicit description. A typed draft forces review. First-use permission explains what to do without hiding typing. Errors preserve drafts and offer an obvious re-record/text fallback. Current TTS interruption remains supported in the eventual app implementation.

The preview simulates recording, a 120-second limit, transcription, review, keyboard sending, opt-in auto-send, permission guidance, transcription failure, cancellation, sample replies, and finish confirmation. It does not record audio, call an API, create sessions, generate feedback, implement full catalog/interview workflows, or play TTS. Scores and messages are clearly labeled sample data. The settings selector is a design review control rather than a proposed account preference. Navigation tabs are preview screen selectors, not a replacement production information architecture.

## Scope and source-of-truth reconciliation

Keep the current Home / Practice / Interview prep / Progress production navigation and complete existing features. Current project-state additions and the explicitly approved September 5 voice spec describe functionality beyond older baseline documents. This proposal follows the current implementation rather than removing those features. It does not reopen providers, storage, authorization, scoring, or attempt lifecycle. `docs/DESIGN.md` remains the approved design until this proposal is accepted.

## Validation before rollout

Recruit 5–8 representative students/early-career professionals for formative testing across desktop and mobile. Counterbalance current/proposed order. Include ordinary speech, a deliberate thinking pause, transcript correction, keyboard-only input, TTS interruption, permission denial, failure recovery, and locating evidence-linked coaching. Measure task success, accidental send/stop, completion time, correction effort, and self-reported comfort separately. A small sample identifies friction; it does not establish population-wide preferences.

Implementation verification should cover recording cancellation races, blur/key release, focused controls and dialogs, existing-draft preservation, duplicate-send prevention, the cap, auto-send consent, STT/TTS failure, browser permission behavior, 200% zoom, mobile keyboard/composer visibility, reduced motion, and screen-reader announcements. Test actual provider latency separately; the prototype's one-second delay is illustrative.

### Checks completed on this prototype

- JavaScript parses successfully; HTML element IDs are unique.
- Browser exercised start → stop → editable transcript → Enter send, auto-send, preserved typed draft after simulated transcription failure, typing during simulated permission trouble, and finish confirmation → results.
- Desktop and 390px mobile screenshots inspected; mobile document width measured 375 CSS pixels inside a 390px viewport with its scrollbar, with no page-level horizontal overflow.
- Main contrast pairs: text/white 14.97:1, muted/white 5.99:1, muted/canvas 5.59:1, white/primary 6.37:1.
- Repository Prettier command was attempted but unavailable (`prettier` executable not found). No dependencies were installed. Application lint/typecheck/test suites were not run because no application code changed; browser interaction checks and syntax/contrast checks cover this standalone deliverable. This is not a complete accessibility conformance audit.
