import Image from "next/image";

import { getScenarioImage } from "@/lib/scenario-images";

export interface ScenarioHeroGraphicProps {
  scenarioKey: string;
  title: string;
}

export function ScenarioHeroGraphic({
  scenarioKey,
  title,
}: ScenarioHeroGraphicProps) {
  const img = getScenarioImage(scenarioKey);

  if (img) {
    return (
      <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-card overflow-hidden border border-border select-none shadow-xs">
        <Image
          src={img}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover object-top"
          placeholder="blur"
          priority
        />
      </div>
    );
  }

  /* Fallback: Memphis geometric composition when no image is available */
  return (
    <div
      aria-hidden="true"
      className="relative w-full h-48 sm:h-60 md:h-64 glass-surface rounded-card overflow-hidden border border-border flex items-center justify-center select-none shadow-xs"
    >
      {/* Background Gradient & Dot Pattern */}
      <div className="absolute inset-0 bg-linear-to-br from-[#dfe3ff] via-[#fcf9f8] to-[#caf300]/30" />
      <div className="absolute inset-0 memphis-dot-grid opacity-60 pointer-events-none" />

      {/* Memphis Geometric Shapes */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border-2 border-border bg-[#0052ff]/10 pointer-events-none" />
      <div className="absolute top-4 right-12 w-6 h-6 rounded-full border border-border bg-[#d4ff00] pointer-events-none shadow-[2px_2px_0px_0px_#1a1a1a]" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full border-2 border-border bg-[#ff6b6b]/15 pointer-events-none" />
      <div className="absolute bottom-6 left-10 w-8 h-8 rotate-12 border border-border bg-[#0052ff] pointer-events-none shadow-[3px_3px_0px_0px_#1a1a1a]" />

      {/* Center Memphis Composition */}
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded-control bg-primary text-primary-foreground border border-border brutalist-shadow flex items-center justify-center">
            <span className="font-display text-xl font-extrabold uppercase">
              {title.charAt(0)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#c7ef00] border border-border flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#171e00]" />
          </div>
          <div className="w-10 h-10 rounded-control bg-[#ffdddb] border border-border rotate-6 flex items-center justify-center">
            <div className="w-4 h-4 border border-border rotate-45 bg-[#b8373b]" />
          </div>
        </div>
        <div className="font-meta text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {scenarioKey.replace(/-/g, " ")}
        </div>
      </div>
    </div>
  );
}
