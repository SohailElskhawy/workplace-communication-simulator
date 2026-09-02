export interface PricingPlan {
  id: "free" | "plus" | "pro";
  name: string;
  badge?: string;
  badgeColor?: string;
  price: string;
  billingPeriod?: string;
  tagline: string;
  simulationsText: string;
  features: string[];
  ctaLabel: string;
  popular?: boolean;
  whatsappMessage?: string;
}

export const WHATSAPP_PHONE_NUMBER = "+905528509969";

export function formatWhatsAppUrl(
  phoneNumber: string,
  message: string,
): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    billingPeriod: "forever",
    tagline: "Essential practice for career starters",
    simulationsText: "3 simulations / week",
    features: [
      "3 AI simulations every 7 days",
      "All 6 workplace scenarios",
      "Easy, Medium & Hard difficulties",
      "Push-to-talk voice & text interaction",
      "5 universal communication skill scores",
      "Structured turn-linked coaching",
    ],
    ctaLabel: "Start Free",
  },
  {
    id: "plus",
    name: "Plus",
    badge: "Most Popular",
    badgeColor: "bg-primary text-primary-foreground",
    price: "$15",
    billingPeriod: "/ month",
    tagline: "Accelerate your professional communication",
    simulationsText: "15 simulations / week",
    features: [
      "15 AI simulations every 7 days",
      "All 6 workplace scenarios & difficulties",
      "Push-to-talk voice & text interaction",
      "Realtime conversational voice mode",
      "5 universal skill scores & scenario rubrics",
      "Detailed turn-linked coaching & alternatives",
      "Attempt history & progress profile",
    ],
    ctaLabel: "Get Plus via WhatsApp",
    popular: true,
    whatsappMessage: "Hi, I would like to upgrade to the Kalemny Plus plan.",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Power User",
    badgeColor: "bg-[#d4ff00] text-[#171e00]",
    price: "$29",
    billingPeriod: "/ month",
    tagline: "Unlimited deliberate practice for leaders",
    simulationsText: "Unlimited simulations",
    features: [
      "Unlimited AI simulations",
      "All scenarios, difficulties & interaction modes",
      "Realtime conversational voice with zero limits",
      "Full attempt history & retry comparisons",
      "Longitudinal skill progression analytics",
      "In-depth coaching with phrase replacements",
      "Direct coach support & early scenario access",
    ],
    ctaLabel: "Get Pro via WhatsApp",
    whatsappMessage: "Hi, I would like to upgrade to the Kalemny Pro plan.",
  },
];
