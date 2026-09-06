"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

export interface LocaleContextValue {
  locale: Locale;
  direction: Direction;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}

export const DICTIONARY: Record<Locale, Record<string, string>> = {
  en: {
    "app.title": "Kalemny",
    "app.tagline": "AI Workplace Communication Simulator",
    "nav.practice": "Practice",
    "nav.interviewPrep": "Interview prep",
    "nav.history": "History",
    "nav.progress": "Progress",
    "quota.bannerTitle": "Free Testing Access",
    "quota.usage": "{remaining} of {limit} sessions remaining this week",
    "quota.resets": "Resets weekly on a rolling 7-day window",
    "custom.title": "Prepare for your real job interview",
    "custom.subtitle":
      "Practice with a personalized AI interviewer tailored to your CV and target job description.",
    "custom.button": "Create custom interview",
    "scenario.recommended": "Recommended for you",
    "scenario.explore": "Explore the library",
    "difficulty.easy": "Foundation",
    "difficulty.medium": "Standard",
    "difficulty.hard": "Challenging",
    "action.start": "Start Practice",
    "action.cancel": "Cancel",
    "action.done": "Done",
    "action.send": "Send",
    "action.retry": "Practice Again",
    "action.stopAudio": "Stop audio",
    "action.back": "Back",
    "action.viewResults": "View results",
    "action.delete": "Delete",
    "action.confirm": "Confirm",
    "voice.tapToTalk": "Tap to talk",
    "voice.listening": "Listening…",
    "voice.releaseToReview": "Tap Done when finished",
    "voice.done": "Done speaking",
    "composer.placeholder": "Type your response here…",
    "status.yourTurn": "Your turn to speak",
    "status.listening": "Listening…",
    "status.transcribing": "Transcribing your voice…",
    "status.thinking": "Counterpart is preparing a response…",
    "status.speaking": "Counterpart is speaking (tap to interrupt)",
    "status.micUnavailable": "Microphone unavailable",
    "results.title": "Practice Session Feedback",
    "results.score": "Overall Practice Score",
    "results.strengths": "Key Strengths",
    "results.growth": "Areas for Improvement",
    "results.suggestion": "Suggested Phrasing",
    "skills.clarity": "Communication Clarity",
    "skills.listening": "Active Listening",
    "skills.composure": "Professional Composure",
    "skills.boundaries": "Assertiveness & Boundaries",
    "skills.reasoning": "Strategic Reasoning",
    "objective.achieved": "Achieved",
    "objective.partial": "Partially Achieved",
    "objective.missed": "Needs Attention",
    "locale.switch": "العربية",
    "locale.current": "English",
  },
  ar: {
    "app.title": "كلمني",
    "app.tagline": "منصة التدريب الذكي على المحادثات المهنية",
    "nav.practice": "التدرّب",
    "nav.interviewPrep": "التحضير للمقابلات",
    "nav.history": "السجل",
    "nav.progress": "تقدّمي",
    "quota.bannerTitle": "وصول مجاني للتجربة",
    "quota.usage": "متبقي لك {remaining} من {limit} جلسات هذا الأسبوع",
    "quota.resets": "تتجدد الحصة تلقائياً على مدار 7 أيام متجددة",
    "custom.title": "استعد لمقابلتك الوظيفية الحقيقية",
    "custom.subtitle":
      "تدرّب مع محاور ذكي مخصص وفقاً لسيرتك الذاتية ووصف الوظيفة المستهدفة.",
    "custom.button": "إنشاء مقابلة مخصصة",
    "scenario.recommended": "مقترح لك",
    "scenario.explore": "استكشف مكتبة المواقف",
    "difficulty.easy": "أساسي",
    "difficulty.medium": "متوسط",
    "difficulty.hard": "متقدم",
    "action.start": "ابدأ التدرّب",
    "action.cancel": "إلغاء",
    "action.done": "تم",
    "action.send": "إرسال",
    "action.retry": "إعادة التدرّب",
    "action.stopAudio": "إيقاف الصوت",
    "action.back": "رجوع",
    "action.viewResults": "عرض النتيجة",
    "action.delete": "حذف",
    "action.confirm": "تأكيد",
    "voice.tapToTalk": "اضغط للتحدث",
    "voice.listening": "نستمع إليك الآن…",
    "voice.releaseToReview": "اضغط تم عند الانتهاء",
    "voice.done": "تم التحدث",
    "composer.placeholder": "اكتب ردك هنا…",
    "status.yourTurn": "دورك في الحديث",
    "status.listening": "نستمع إليك الآن…",
    "status.transcribing": "جارٍ تحويل الصوت إلى نص…",
    "status.thinking": "المحاور يجهز الرد الآن…",
    "status.speaking": "المحاور يتحدث (اضغط للمقاطعة)",
    "status.micUnavailable": "الميكروفون غير متوفر",
    "results.title": "تقرير أداء جلسة التدرّب",
    "results.score": "النتيجة الإجمالية للجلسة",
    "results.strengths": "نقاط القوة الرئيسية",
    "results.growth": "فرص التحسين والتطوير",
    "results.suggestion": "صياغة بديلة مقترحة",
    "skills.clarity": "وضوح التواصل",
    "skills.listening": "الاستماع النشط",
    "skills.composure": "الهدوء والثبات المهني",
    "skills.boundaries": "الحزم ووضع الحدود",
    "skills.reasoning": "التفكير الاستراتيجي والإقناع",
    "objective.achieved": "تم تحقيقه بنجاح",
    "objective.partial": "تم تحقيقه جزئياً",
    "objective.missed": "بحاجة إلى تركيز",
    "locale.switch": "English",
    "locale.current": "العربية",
  },
};

const STORAGE_KEY = "kalemny_ui_locale";

const LocaleContext = createContext<LocaleContextValue | null>(null);

function getInitialLocale(defaultLocale: Locale): Locale {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "ar") {
      return stored;
    }
    if (
      typeof navigator !== "undefined" &&
      navigator.language?.startsWith("ar")
    ) {
      return "ar";
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return defaultLocale;
}

export function LocaleProvider({
  children,
  defaultLocale = "en",
}: {
  children: ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    getInitialLocale(defaultLocale),
  );

  // Synchronize document dir and lang attributes with the active locale
  useEffect(() => {
    if (typeof document === "undefined") return;
    const direction: Direction = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Ignore storage failures
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "ar" : "en");
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = DICTIONARY[locale] ?? DICTIONARY.en;
      return dict[key] ?? fallback ?? key;
    },
    [locale],
  );

  const direction: Direction = locale === "ar" ? "rtl" : "ltr";
  const isRtl = direction === "rtl";

  return (
    <LocaleContext.Provider
      value={{
        locale,
        direction,
        isRtl,
        setLocale,
        toggleLocale,
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    // Graceful fallback for components rendered outside LocaleProvider (e.g. unit tests)
    return {
      locale: "en",
      direction: "ltr",
      isRtl: false,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) =>
        DICTIONARY.en[key] ?? fallback ?? key,
    };
  }
  return context;
}
