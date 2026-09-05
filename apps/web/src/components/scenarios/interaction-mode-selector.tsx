import type { InteractionMode } from "@kalemny/contracts";

import { CheckIcon, MicIcon, VolumeIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

export interface InteractionModeOption {
  key: InteractionMode;
  title: string;
  tagline: string;
  description: string;
}

export const INTERACTION_MODE_OPTIONS: Record<
  InteractionMode,
  InteractionModeOption
> = {
  PUSH_TO_TALK: {
    key: "PUSH_TO_TALK",
    title: "Push-to-Talk",
    tagline: "Record → transcribe → review → send",
    description:
      "Hold the microphone to record each response, review the editable transcript, then send. Typing stays available on every turn.",
  },
  REALTIME: {
    key: "REALTIME",
    title: "Realtime Voice",
    tagline: "Live conversation with your counterpart",
    description:
      "Talk with your counterpart in real time over a live voice session. Experimental; the finalized transcript is saved after the call.",
  },
};

export interface InteractionModeSelectorProps {
  availableModes: InteractionMode[];
  selectedMode: InteractionMode;
  onSelectMode: (mode: InteractionMode) => void;
}

export function InteractionModeSelector({
  availableModes,
  selectedMode,
  onSelectMode,
}: InteractionModeSelectorProps) {
  return (
    <section
      aria-label="Select interaction mode"
      className="space-y-3 sm:space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Choose how to practice
        </h2>
        <span className="font-meta text-[11px] sm:text-xs text-muted-foreground">
          Chooses how you speak with your counterpart
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {availableModes.map((modeKey) => {
          const option = INTERACTION_MODE_OPTIONS[modeKey];
          const isSelected = selectedMode === modeKey;
          const Icon = modeKey === "REALTIME" ? VolumeIcon : MicIcon;

          return (
            <button
              key={modeKey}
              type="button"
              onClick={() => onSelectMode(modeKey)}
              aria-pressed={isSelected}
              className={cn(
                "relative flex min-h-44 flex-col justify-between rounded-card border bg-surface-solid p-4 text-start shadow-xs transition sm:p-5",
                isSelected
                  ? "border-primary bg-primary-muted"
                  : "border-border-subtle hover:border-border",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "font-display text-lg font-semibold",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {option.title}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border border-border bg-surface-solid" />
                  )}
                </div>

                <div className="font-meta text-[10px] sm:text-[11px] uppercase font-bold text-muted-foreground mb-1.5 sm:mb-2">
                  {option.tagline}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </div>

              {modeKey === "PUSH_TO_TALK" && (
                <div className="mt-3 sm:mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[9px] sm:text-[10px] uppercase font-bold text-primary">
                    Recommended
                  </span>
                </div>
              )}
              {modeKey === "REALTIME" && (
                <div className="mt-3 sm:mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground">
                    Experimental
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
