-- Repair migration: the `transcriptImportedAt` column was amended into the
-- already-applied `20260831120000_add_realtime_conversation` migration, so
-- databases that applied it earlier never received the column. Every
-- `RealtimeConversation` write/read that returns all scalar fields failed
-- with P2022 (500 on the bind endpoint and the webhook import).
-- `IF NOT EXISTS` keeps this a no-op on databases created from the current
-- migration set, where the column already exists.
ALTER TABLE "RealtimeConversation"
ADD COLUMN IF NOT EXISTS "transcriptImportedAt" TIMESTAMPTZ(3);
