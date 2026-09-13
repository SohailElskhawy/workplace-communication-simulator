"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  ArabicDialect,
  Difficulty,
  InteractionMode,
  PublicScenarioDetail,
  SupportedLanguage,
} from "@kalemny/contracts";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CloseIcon,
  DocumentTextIcon,
  InterviewIcon,
  PlayIcon,
  RefreshIcon,
  SparklesIcon,
  TargetIcon,
  UserIcon,
} from "@/components/icons";
import { DifficultySelector } from "@/components/scenarios/difficulty-selector";
import { LanguageDialectSelector } from "@/components/scenarios/language-dialect-selector";
import { PracticeModeSelector } from "@/components/scenarios/practice-mode-selector";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { useLocale } from "@/lib/locale-context";

export interface CustomInterviewWizardProps {
  userEffectivePlan?: "FREE" | "PLUS" | "PRO";
  onCancel?: () => void;
  onSuccessStart?: (attemptId: string) => void;
}

type WizardStep = "INPUT" | "GENERATING" | "REVIEW" | "STARTING";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MIN_JD_CHARS = 50;
const MAX_JD_CHARS = 20000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CustomInterviewWizard({
  onCancel,
  onSuccessStart,
}: CustomInterviewWizardProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { locale, direction } = useLocale();
  const isAr = locale === "ar";

  const [step, setStep] = useState<WizardStep>("INPUT");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");

  // Configuration state for practice rehearsal
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    locale === "ar" ? "ar" : "en",
  );
  const [selectedDialect, setSelectedDialect] =
    useState<ArabicDialect>("EGYPTIAN");
  const [selectedInteractionMode, setSelectedInteractionMode] =
    useState<InteractionMode>("PUSH_TO_TALK");

  const [generatedScenario, setGeneratedScenario] =
    useState<PublicScenarioDetail | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  const handleFileSelection = (file: File | null) => {
    setError(null);
    if (!file) {
      setCvFile(null);
      return;
    }

    if (
      !file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf"
    ) {
      setError(
        isAr
          ? "الملفات المدعومة للسيرة الذاتية هي بصيغة PDF فقط."
          : "Only PDF files are supported for CV upload.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        isAr
          ? "حجم ملف السيرة الذاتية يتجاوز الحد الأقصى المسموح به (5 ميجابايت)."
          : "The selected CV PDF exceeds the 5MB size limit.",
      );
      return;
    }

    setCvFile(file);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    handleFileSelection(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleFileSelection(file);
  };

  const trimmedJd = jobDescription.trim();

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    if (step === "GENERATING") return;

    if (!cvFile) {
      setError(
        isAr
          ? "يرجى رفع سيرتك الذاتية بصيغة PDF."
          : "Please upload your candidate CV in PDF format.",
      );
      return;
    }

    if (trimmedJd.length < MIN_JD_CHARS) {
      setError(
        isAr
          ? `يرجى إدخال وصف وظيفي أكثر تفصيلاً (${MIN_JD_CHARS} حرفاً على الأقل).`
          : `Please provide a more detailed job description (minimum ${MIN_JD_CHARS} characters).`,
      );
      return;
    }

    if (trimmedJd.length > MAX_JD_CHARS) {
      setError(
        isAr
          ? `لا يمكن أن يتجاوز الوصف الوظيفي ${MAX_JD_CHARS.toLocaleString()} حرف.`
          : `Job description cannot exceed ${MAX_JD_CHARS.toLocaleString()} characters.`,
      );
      return;
    }

    try {
      setStep("GENERATING");
      setError(null);

      const token = await getToken();
      if (!token) {
        throw new Error(
          isAr
            ? "رمز المصادقة غير متوفر. يرجى تسجيل الدخول مجدداً."
            : "Authentication token is unavailable. Please sign in again.",
        );
      }

      const client = createApiClient(apiUrl);
      const scenario = await client.createCustomScenario(
        token,
        cvFile,
        trimmedJd,
      );

      setGeneratedScenario(scenario);

      // Calibrate initial difficulty if MEDIUM is not in available options
      if (
        scenario.availableDifficulties &&
        !scenario.availableDifficulties.includes("MEDIUM")
      ) {
        setSelectedDifficulty(scenario.availableDifficulties[0] ?? "MEDIUM");
      }

      setStep("REVIEW");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "فشل إنشاء سيناريو المقابلة المخصصة. يرجى المحاولة مرة أخرى."
            : "Failed to generate custom interview scenario. Please try again.",
      );
      setStep("INPUT");
    }
  };

  const handleStartSimulation = async () => {
    if (!generatedScenario || step === "STARTING") return;

    try {
      setStep("STARTING");
      setStartError(null);

      const token = await getToken();
      if (!token) {
        throw new Error(
          isAr
            ? "رمز المصادقة غير متوفر. يرجى تسجيل الدخول مجدداً."
            : "Authentication token is unavailable. Please sign in again.",
        );
      }

      const client = createApiClient(apiUrl);
      const attempt = await client.createAttempt(token, {
        scenarioKey: generatedScenario.key,
        difficulty: selectedDifficulty,
        language: selectedLanguage,
        dialect: selectedLanguage === "ar" ? selectedDialect : undefined,
        interactionMode: selectedInteractionMode,
        retryOfAttemptId: null,
      });

      if (onSuccessStart) {
        onSuccessStart(attempt.id);
      } else {
        router.push(`/app/simulations/${encodeURIComponent(attempt.id)}`);
      }
    } catch (err: unknown) {
      setStartError(
        err instanceof Error
          ? err.message
          : isAr
            ? "فشل بدء جلسة المحاكاة المخصصة. يرجى المحاولة مرة أخرى."
            : "Failed to start custom simulation rehearsal.",
      );
      setStep("REVIEW");
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Top Error Alert */}
      {error && (
        <div
          role="alert"
          className="rounded-control border border-alert/30 bg-alert-surface p-3.5 sm:p-4 text-xs sm:text-sm text-alert-foreground flex items-start gap-3"
        >
          <AlertTriangleIcon className="w-5 h-5 shrink-0 text-alert mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Step 3: Generating Loading State */}
      {step === "GENERATING" && (
        <div
          role="status"
          aria-live="polite"
          className="py-10 sm:py-16 px-4 text-center space-y-6 max-w-lg mx-auto"
        >
          <div className="relative mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <RefreshIcon className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {isAr
                ? "جارٍ إعداد مقابلتك المخصصة..."
                : "Preparing your personalized interview..."}
            </h3>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isAr
                ? "نحلل سيرتك الذاتية في الذاكرة المؤقتة ونبني شخصية المحاور والأسئلة ومعايير التقييم استناداً إلى خبرتك ومتطلبات الوظيفة."
                : "Parsing your candidate CV in memory and grounding roleplay persona, questions, and rubrics strictly on your background and target job requirements."}
            </p>
          </div>

          <div className="rounded-control bg-surface-subtle border border-border-subtle p-3.5 sm:p-4 text-start font-meta text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span>
                {isAr
                  ? "معالجة فورية في الذاكرة دون تخزين ملفات"
                  : "In-Memory Parsing & Zero File Storage"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              {isAr
                ? "تتم معالجة المستند بأكمله في الذاكرة المؤقتة فقط دون حفظ الملف على خوادمنا. تستغرق العملية عادة من 10 إلى 15 ثانية."
                : "Your CV is analyzed in-memory only and never saved as a file on our servers. This typically takes ~10–15 seconds. Please keep this window open."}
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Review Summary & Start Simulation State */}
      {(step === "REVIEW" || step === "STARTING") && generatedScenario && (
        <div className="space-y-6">
          {/* Success Header Banner */}
          <div className="rounded-card border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-meta text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <SparklesIcon className="w-4 h-4" />
                {isAr ? "مقابلتك المخصصة جاهزة" : "Your interview is ready"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full border border-border-subtle font-meta text-[10px] font-bold uppercase tracking-wider bg-surface-solid text-foreground">
                {isAr ? "مخصصة" : "Personalized"}
              </span>
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              {isAr && generatedScenario.titleAr
                ? generatedScenario.titleAr
                : generatedScenario.title}
            </h3>

            <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isAr && generatedScenario.summaryAr
                ? generatedScenario.summaryAr
                : generatedScenario.summary}
            </p>
          </div>

          {/* Scenario Briefing & Context Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-display text-xs font-bold uppercase tracking-wider">
                <UserIcon className="w-4 h-4 text-primary shrink-0" />
                <span>{isAr ? "دورك" : "Your Role"}</span>
              </div>
              <p className="font-sans text-sm text-muted-foreground">
                {isAr && generatedScenario.context.userRoleAr
                  ? generatedScenario.context.userRoleAr
                  : generatedScenario.context.userRole}
              </p>
            </div>

            <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1">
              <div className="flex items-center gap-1.5 text-foreground font-display text-xs font-bold uppercase tracking-wider">
                <InterviewIcon className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {isAr
                    ? "دور المحاور (الذكاء الاصطناعي)"
                    : "Interviewer (AI Counterpart)"}
                </span>
              </div>
              <p className="font-sans text-sm text-muted-foreground">
                {isAr && generatedScenario.context.aiRoleAr
                  ? generatedScenario.context.aiRoleAr
                  : generatedScenario.context.aiRole}
              </p>
            </div>

            <div className="rounded-card bg-primary/5 p-4 border border-primary/20 space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-primary font-display text-xs font-bold uppercase tracking-wider">
                <TargetIcon className="w-4 h-4 shrink-0" />
                <span>{isAr ? "الهدف الأساسي" : "Focus Objectives"}</span>
              </div>
              <p className="font-sans text-sm text-foreground leading-relaxed font-medium">
                {isAr && generatedScenario.context.userObjectiveAr
                  ? generatedScenario.context.userObjectiveAr
                  : generatedScenario.context.userObjective}
              </p>
            </div>

            {generatedScenario.context.stakes && (
              <div className="rounded-card bg-surface-subtle p-4 border border-border-subtle space-y-1 sm:col-span-2">
                <span className="font-meta text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  {isAr ? "سياق المقابلة وأهميتها" : "Interview Stakes & Context"}
                </span>
                <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {isAr && generatedScenario.context.stakesAr
                    ? generatedScenario.context.stakesAr
                    : generatedScenario.context.stakes}
                </p>
              </div>
            )}
          </div>

          {/* Practice Configuration Selectors */}
          <div className="space-y-6 pt-2 border-t border-border-subtle">
            <DifficultySelector
              availableDifficulties={
                generatedScenario.availableDifficulties ?? [
                  "EASY",
                  "MEDIUM",
                  "HARD",
                ]
              }
              selectedDifficulty={selectedDifficulty}
              onSelectDifficulty={setSelectedDifficulty}
            />

            <LanguageDialectSelector
              language={selectedLanguage}
              dialect={selectedDialect}
              onSelectLanguage={setSelectedLanguage}
              onSelectDialect={setSelectedDialect}
            />

            <PracticeModeSelector
              mode={selectedInteractionMode}
              onSelectMode={setSelectedInteractionMode}
              language={selectedLanguage}
            />
          </div>

          {/* Testing Policy Note */}
          <div className="rounded-control bg-surface-subtle border border-border-subtle p-3.5 text-xs text-muted-foreground">
            <p>
              {isAr
                ? "إنشاء هذا السيناريو مجاني تماماً. بدء التدرّب يستهلك 1 من جلساتك الأسبوعية."
                : "Generating this interview is free. Starting practice consumes 1 of your weekly sessions."}
            </p>
          </div>

          {/* Start Error Alert */}
          {startError && (
            <div
              role="alert"
              className="rounded-control border border-alert/30 bg-alert-surface p-3.5 text-xs text-alert-foreground flex items-center gap-2"
            >
              <AlertTriangleIcon className="w-4 h-4 text-alert shrink-0" />
              <span>{startError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setStep("INPUT")}
              disabled={step === "STARTING"}
              className="flex min-h-[44px] items-center justify-center rounded-control border border-border bg-surface-solid px-5 py-2.5 font-display text-sm font-semibold text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              {isAr ? "← تعديل البيانات" : "← Modify Inputs"}
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={step === "STARTING"}
                  className="flex min-h-[44px] items-center justify-center rounded-control border border-border bg-surface-solid px-5 py-2.5 font-display text-sm font-semibold text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              )}

              <button
                type="button"
                onClick={handleStartSimulation}
                disabled={step === "STARTING"}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-primary px-6 py-2.5 font-display text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === "STARTING" ? (
                  <>
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span>{isAr ? "جاري البدء..." : "Starting..."}</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    <span>
                      {isAr
                        ? "ابدأ المقابلة المخصصة"
                        : "Start Interview Practice"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Steps 1 & 2: Input Configuration Form */}
      {step === "INPUT" && (
        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Step 1: CV Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cv-upload-input"
                className="block font-display text-sm sm:text-base font-semibold text-foreground"
              >
                {isAr ? "1. ارفع سيرتك الذاتية (PDF)" : "1. Upload your CV (PDF)"}{" "}
                <span className="text-alert">*</span>
              </label>
              <span className="font-meta text-xs text-muted-foreground">
                {isAr ? "الحد الأقصى 5 ميجابايت" : "Max 5MB"}
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-card border-2 border-dashed p-6 sm:p-8 text-center transition-all",
                isDragging
                  ? "border-primary bg-selected-surface"
                  : cvFile
                    ? "border-primary/40 bg-surface-subtle"
                    : "border-border hover:border-primary/40 bg-surface-solid hover:bg-surface-subtle",
              )}
            >
              <input
                id="cv-upload-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                className="sr-only"
              />

              {cvFile ? (
                <div className="flex items-center justify-between gap-3 text-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground truncate">
                        {cvFile.name}
                      </p>
                      <p className="font-meta text-xs text-muted-foreground">
                        {formatFileSize(cvFile.size)} • PDF
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCvFile(null)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control border border-border bg-surface-solid text-muted-foreground hover:text-alert hover:border-alert/30 hover:bg-alert-surface transition-colors cursor-pointer"
                    aria-label={
                      isAr ? "إزالة الملف المرفوع" : "Remove uploaded file"
                    }
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="cv-upload-input"
                  className="cursor-pointer block space-y-2"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center text-muted-foreground">
                    <DocumentTextIcon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="font-display text-sm sm:text-base font-semibold text-foreground">
                    {isAr
                      ? "اضغط لاختيار الملف أو اسحب وأفلت سيرتك الذاتية (PDF)"
                      : "Click to browse or drag and drop your CV PDF"}
                  </p>
                  <p className="font-meta text-xs text-muted-foreground">
                    {isAr
                      ? "صيغة PDF فقط (حتى 5 ميجابايت). تتم المعالجة بالكامل في الذاكرة."
                      : "PDF format only (up to 5MB). Processed strictly in memory."}
                  </p>
                </label>
              )}
            </div>
          </div>

          {/* Step 2: Job Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="jd-textarea"
                className="block font-display text-sm sm:text-base font-semibold text-foreground"
              >
                {isAr ? "2. أضف الوصف الوظيفي" : "2. Add the job description"}{" "}
                <span className="text-alert">*</span>
              </label>
              <span className="font-meta text-xs text-muted-foreground shrink-0">
                {isAr
                  ? `${trimmedJd.length} / ${MIN_JD_CHARS} حرف كحد أدنى (الحد الأقصى ${MAX_JD_CHARS.toLocaleString()})`
                  : `${trimmedJd.length} / ${MIN_JD_CHARS} min chars (max ${MAX_JD_CHARS.toLocaleString()})`}
              </span>
            </div>

            <textarea
              id="jd-textarea"
              rows={4}
              value={jobDescription}
              maxLength={MAX_JD_CHARS}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder={
                isAr
                  ? "الصق الوصف الوظيفي المستهدف كاملاً (المسؤوليات الرئيسية، المؤهلات المطلوبة، المهارات التقنية، ومجال عمل الشركة)..."
                  : "Paste the full job description here (responsibilities, required qualifications, technical skills, company domain, and expectations)..."
              }
              className="w-full rounded-control border border-border bg-surface-solid p-3 sm:p-3.5 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-y min-h-[120px]"
            />
          </div>

          {/* Privacy Assurance Callout */}
          <div className="rounded-control bg-surface-subtle border border-border-subtle p-3 sm:p-4">
            <p className="font-meta text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground font-semibold">
                {isAr ? "خصوصية تامة بالتصميم:" : "Private by design:"}
              </strong>{" "}
              {isAr
                ? "تتم معالجة سيرتك الذاتية في الذاكرة المؤقتة فقط ولا يتم تخزين أي ملفات أو بيانات شخصية بشكل دائم. يتم صياغة أسئلة المقابلة استناداً إلى سيرتك والوصف الوظيفي الذي تقدمه."
                : "Your CV is parsed strictly in-memory and never permanently stored as a document. Interview questions and rubric evaluation are grounded strictly in your CV and the job description you provide."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex min-h-[44px] items-center justify-center rounded-control border border-border bg-surface-solid px-5 py-2.5 font-display text-sm font-semibold text-foreground hover:bg-surface-subtle transition-colors cursor-pointer"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            )}

            <button
              type="submit"
              disabled={
                !cvFile ||
                trimmedJd.length < MIN_JD_CHARS ||
                trimmedJd.length > MAX_JD_CHARS
              }
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-primary px-6 py-2.5 font-display text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <SparklesIcon className="w-4 h-4 shrink-0" />
              <span>
                {isAr
                  ? "إنشاء المقابلة المخصصة"
                  : "Create personalized interview"}
              </span>
              <ArrowRightIcon className="directional-icon w-4 h-4 shrink-0" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
