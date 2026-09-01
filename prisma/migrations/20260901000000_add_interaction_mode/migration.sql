-- Interaction mode chosen at simulation start: push-to-talk (Release 1
-- default) or the feature-flagged realtime live conversation.
CREATE TYPE "InteractionMode" AS ENUM ('PUSH_TO_TALK', 'REALTIME');

ALTER TABLE "SimulationAttempt"
ADD COLUMN "interactionMode" "InteractionMode" NOT NULL DEFAULT 'PUSH_TO_TALK';
