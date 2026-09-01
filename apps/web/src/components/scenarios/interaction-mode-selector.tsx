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
    <section aria-label="Select interaction mode" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
          Select Interaction Mode
        </h2>
        <span className="font-meta text-xs text-muted-foreground">
          Chooses how you speak with your counterpart
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                "glass-surface rounded-card p-5 text-left border transition-all duration-200 ease-out relative flex flex-col justify-between cursor-pointer select-none",
                isSelected
                  ? "border-2 border-primary bg-primary/5 shadow-[4px_4px_0px_0px_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                  : "border-border shadow-xs hover:border-border/80 hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
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
                        "font-display text-lg font-bold uppercase tracking-tight",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                    >
                      {option.title}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border border-primary">
                      <CheckIcon className="w-3 h-3 stroke-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-border/30 bg-surface-subtle" />
                  )}
                </div>

                <div className="font-meta text-[11px] uppercase font-bold text-muted-foreground mb-2">
                  {option.tagline}
                </div>

                <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </div>

              {modeKey === "PUSH_TO_TALK" && (
                <div className="mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[10px] uppercase font-bold text-primary">
                    Recommended Default
                  </span>
                </div>
              )}
              {modeKey === "REALTIME" && (
                <div className="mt-4 pt-2 border-t border-border/10">
                  <span className="font-meta text-[10px] uppercase font-bold text-muted-foreground">
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
