import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BrandLogoVariant =
  | "mark-only"
  | "lockup-en"
  | "lockup-ar"
  | "bilingual";

export type BrandLogoSize = "sm" | "md" | "lg";

export interface BrandLogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  isRtl?: boolean;
}

const sizeConfig: Record<
  BrandLogoSize,
  {
    markSize: number;
    textSizeEn: string;
    textSizeAr: string;
    gap: string;
  }
> = {
  sm: {
    markSize: 24,
    textSizeEn: "text-base font-bold",
    textSizeAr: "text-lg font-bold",
    gap: "gap-2",
  },
  md: {
    markSize: 32,
    textSizeEn: "text-xl font-bold",
    textSizeAr: "text-2xl font-bold",
    gap: "gap-2.5",
  },
  lg: {
    markSize: 40,
    textSizeEn: "text-2xl font-extrabold",
    textSizeAr: "text-3xl font-bold",
    gap: "gap-3",
  },
};

/**
 * Standalone Warm Coral vector logo mark.
 * Features a warm coral speech bubble with three white dialogue aperture dots.
 */
export function BrandLogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="brand-coral-gradient"
          x1="4"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F47765" />
          <stop offset="100%" stopColor="#B84132" />
        </linearGradient>
      </defs>
      <path
        d="M6 14C6 8.47715 10.4772 4 16 4C21.5228 4 26 8.47715 26 14C26 19.5228 21.5228 24 16 24C13.8447 24 11.8384 23.3188 10.1915 22.1585L6.45265 23.9535C5.81185 24.2612 5.08906 23.7087 5.22858 23.0076L5.93297 19.4674C5.33777 17.8286 5 16.0355 5 14.1957"
        fill="url(#brand-coral-gradient)"
      />
      <circle cx="12" cy="14" r="1.75" fill="#FFFFFF" />
      <circle cx="16" cy="14" r="1.75" fill="#FFFFFF" />
      <circle cx="20" cy="14" r="1.75" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * Concept A Bilingual Brand Logo component for Kalemny / كلمني.
 */
export function BrandLogo({
  variant,
  size = "md",
  className,
  isRtl = false,
  ...props
}: BrandLogoProps) {
  const resolvedVariant = variant ?? (isRtl ? "lockup-ar" : "lockup-en");
  const config = sizeConfig[size];

  if (resolvedVariant === "mark-only") {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        aria-label="Kalemny | كلمني"
        {...props}
      >
        <BrandLogoMark size={config.markSize} />
      </span>
    );
  }

  if (resolvedVariant === "lockup-ar") {
    return (
      <span
        className={cn(
          "inline-flex items-center select-none",
          config.gap,
          className,
        )}
        dir="rtl"
        aria-label="كلمني"
        {...props}
      >
        <span
          className={cn(
            config.textSizeAr,
            "text-foreground tracking-normal font-sans leading-none",
          )}
        >
          كلمني
        </span>
        <BrandLogoMark size={config.markSize} />
      </span>
    );
  }

  if (resolvedVariant === "bilingual") {
    return (
      <span
        className={cn(
          "inline-flex items-center select-none",
          config.gap,
          className,
        )}
        aria-label="Kalemny | كلمني"
        {...props}
      >
        <BrandLogoMark size={config.markSize} />
        <span
          className={cn(
            config.textSizeEn,
            "text-foreground tracking-tight font-sans leading-none",
          )}
        >
          Kalemny
        </span>
        <span className="text-border mx-1 leading-none text-sm select-none" aria-hidden="true">
          |
        </span>
        <span
          className={cn(
            config.textSizeAr,
            "text-muted-foreground tracking-normal font-sans leading-none",
          )}
        >
          كلمني
        </span>
      </span>
    );
  }

  // Default: lockup-en
  return (
    <span
      className={cn(
        "inline-flex items-center select-none",
        config.gap,
        className,
      )}
      aria-label="Kalemny"
      {...props}
    >
      <BrandLogoMark size={config.markSize} />
      <span
        className={cn(
          config.textSizeEn,
          "text-foreground tracking-tight font-sans leading-none",
        )}
      >
        Kalemny
      </span>
    </span>
  );
}
