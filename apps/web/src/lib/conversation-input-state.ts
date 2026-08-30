import type { SpeechPlaybackStatus } from "./speech-playback-controller";

export function isConversationInputDisabled({
  counterpartSpeechStatus,
  finishing,
  isExpired,
  isLimitReached,
  sendingTurn,
}: {
  counterpartSpeechStatus: SpeechPlaybackStatus;
  finishing: boolean;
  isExpired: boolean;
  isLimitReached: boolean;
  sendingTurn: boolean;
}): boolean {
  return (
    sendingTurn ||
    finishing ||
    isExpired ||
    isLimitReached ||
    counterpartSpeechStatus === "loading" ||
    counterpartSpeechStatus === "playing"
  );
}
