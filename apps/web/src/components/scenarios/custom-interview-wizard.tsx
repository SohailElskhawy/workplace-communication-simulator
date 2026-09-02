"use client";

import { useAuth } from "@clerk/nextjs";
import type {
  Difficulty,
  InteractionMode,
  PublicScenarioDetail,
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
  DocumentTextIcon,
  InterviewIcon,
  PlayIcon,
  RefreshIcon,
  SparklesIcon,
  TargetIcon,
  UserIcon,
} from "@/components/icons";
import { DifficultySelector } from "@/components/scenarios/difficulty-selector";
import { InteractionModeSelector } from "@/components/scenarios/interaction-mode-selector";
import { createApiClient } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { isRealtimeVoiceEnabled } from "@/lib/feature-flags";

export interface CustomInterviewWizardProps {
  userEffectivePlan?: "FREE" | "PLUS" | "PRO";
  onCancel?: () => void;
  onSuccessStart?: (attemptId: string) => void;
}

type WizardStep = "INPUT" | "GENERATING" | "REVIEW" | "STARTING";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function CustomInterviewWizard({
  onCancel,
  onSuccessStart,
}: CustomInterviewWizardProps) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [step, setStep] = useState<WizardStep>("INPUT");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty>("MEDIUM");
  const [selectedInteractionMode, setSelectedInteractionMode] =
    useState<InteractionMode>("PUSH_TO_TALK");

  const [generatedScenario, setGeneratedScenario] =
    useState<PublicScenarioDetail | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const realtimeVoiceEnabled = isRealtimeVoiceEnabled();
  const availableInteractionModes: InteractionMode[] = realtimeVoiceEnabled
    ? ["PUSH_TO_TALK", "REALTIME"]
    : ["PUSH_TO_TALK"];

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
      setError("Only PDF files are supported for CV upload.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("The selected CV PDF exceeds the 5MB size limit.");
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

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    if (step === "GENERATING") return;

    if (!cvFile) {
      setError("Please upload your candidate CV in PDF format.");
      return;
    }

    const trimmedJd = jobDescription.trim();
    if (trimmedJd.length < 50) {
      setError(
        "Please provide a more detailed job description (minimum 50 characters).",
      );
      return;
    }

    try {
      setStep("GENERATING");
      setError(null);

      const token = await getToken();
      if (!token) {
        throw new Error(
          "Authentication token is unavailable. Please sign in again.",
        );
      }

      const client = createApiClient(apiUrl);
      const scenario = await client.createCustomScenario(
        token,
        cvFile,
        trimmedJd,
      );

      setGeneratedScenario(scenario);
      setStep("REVIEW");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
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
          "Authentication token is unavailable. Please sign in again.",
        );
      }

      const client = createApiClient(apiUrl);
      const attempt = await client.createAttempt(token, {
        scenarioKey: generatedScenario.key,
        difficulty: selectedDifficulty,
        retryOfAttemptId: null,
        interactionMode: selectedInteractionMode,
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
          : "Failed to start custom simulation rehearsal.",
      );
      setStep("REVIEW");
    }
  };

  // 1. Generating Loading State
  if (step === "GENERATING") {
    return (
      <div className="py-8 sm:py-12 px-2 text-center space-y-5">
        <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary shadow-[3px_3px_0px_0px_#1a1a1a]">
          <RefreshIcon className="w-7 h-7 sm:w-8 sm:h-8 animate-spin" />
        </div>

        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">
            Crafting Your Custom Interview
          </h3>
          <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Parsing your candidate CV in memory and grounding roleplay persona,
            questions, and rubrics strictly on your background and target job
            requirements.
          </p>
        </div>

        <div className="max-w-xs mx-auto space-y-2 text-left font-meta text-xs text-muted-foreground bg-surface-raised border border-border/20 rounded-control p-3.5 shadow-2xs">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <span>AI Scenario Generation In Progress</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            This typically takes ~10–15 seconds. Please keep this window open.
          </p>
        </div>
      </div>
    );
  }

  // 3. Review Summary & Start Simulation State
  if (step === "REVIEW" || step === "STARTING") {
    if (!generatedScenario) return null;

    return (
      <div className="space-y-5 sm:space-y-6">
        {/* Success Header Banner */}
        <div className="rounded-control border-2 border-primary bg-primary/5 p-4 sm:p-5 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-meta text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5" />
              Custom Scenario Ready
            </span>
            <span className="px-2 py-0.5 rounded-full border border-border font-meta text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-surface-raised text-foreground">
              Custom Interview
            </span>
          </div>

          <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-tight text-foreground">
            {generatedScenario.title}
          </h3>

          <p className="font-sans text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {generatedScenario.summary}
          </p>
        </div>

        {/* Scenario Briefing & Context Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="glass-surface rounded-card p-3 sm:p-3.5 border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-foreground font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <UserIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Your Role</span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground">
              {generatedScenario.context.userRole}
            </p>
          </div>

          <div className="glass-surface rounded-card p-3 sm:p-3.5 border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-foreground font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <InterviewIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Interviewer (AI Counterpart)</span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-muted-foreground">
              {generatedScenario.context.aiRole}
            </p>
          </div>

          <div className="glass-surface rounded-card p-3 sm:p-3.5 border border-border space-y-1 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-foreground font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              <TargetIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Core Objective</span>
            </div>
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              {generatedScenario.context.userObjective}
            </p>
          </div>

          <div className="glass-surface rounded-card p-3 sm:p-3.5 border border-border space-y-1 sm:col-span-2">
            <span className="font-meta text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Interview Stakes & Context
            </span>
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              {generatedScenario.context.stakes}
            </p>
          </div>
        </div>

        {/* Difficulty Selection */}
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

        {/* Voice Interaction Mode Selection */}
        {realtimeVoiceEnabled && (
          <InteractionModeSelector
            availableModes={availableInteractionModes}
            selectedMode={selectedInteractionMode}
            onSelectMode={setSelectedInteractionMode}
          />
        )}

        {/* Start Error Alert */}
        {startError && (
          <div
            role="alert"
            className="rounded-control border-2 border-alert bg-alert/10 p-3 sm:p-4 font-sans text-xs text-alert shadow-xs"
          >
            {startError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/20">
          <button
            type="button"
            onClick={() => setStep("INPUT")}
            disabled={step === "STARTING"}
            className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-control bg-surface-raised border border-border font-meta text-xs font-bold uppercase text-foreground hover:bg-surface-subtle transition-colors cursor-pointer text-center"
          >
            ← Modify Inputs
          </button>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={step === "STARTING"}
                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-control bg-surface-raised border border-border font-meta text-xs font-bold uppercase text-foreground hover:bg-surface-subtle transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            )}

            <button
              type="button"
              onClick={handleStartSimulation}
              disabled={step === "STARTING"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-control bg-primary px-6 py-2.5 sm:px-8 sm:py-3 font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50 text-center"
            >
              {step === "STARTING" ? (
                <>
                  <RefreshIcon className="w-4 h-4 animate-spin" />
                  <span>Starting Rehearsal...</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  <span>Begin Simulation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Input Configuration Form (Step: INPUT)
  return (
    <form onSubmit={handleGenerate} className="space-y-4 sm:space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-control border-2 border-alert bg-alert/10 p-3 sm:p-4 font-sans text-xs text-alert flex items-start gap-2.5 shadow-xs"
        >
          <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. CV Upload */}
      <div className="space-y-1.5">
        <label
          htmlFor="cv-upload-input"
          className="block font-meta text-xs font-bold uppercase tracking-wider text-foreground"
        >
          1. Upload Candidate CV (PDF) <span className="text-alert">*</span>
        </label>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-control p-4 sm:p-5 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/10"
              : cvFile
                ? "border-success bg-success/5"
                : "border-border/60 hover:border-border bg-surface-raised",
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
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <DocumentTextIcon className="w-5 h-5 text-success shrink-0" />
                <div className="min-w-0">
                  <p className="font-sans text-xs sm:text-sm font-bold text-foreground truncate">
                    {cvFile.name}
                  </p>
                  <p className="font-meta text-[11px] text-muted-foreground">
                    {(cvFile.size / 1024).toFixed(1)} KB (PDF)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCvFile(null)}
                className="p-1 text-muted-foreground hover:text-alert transition-colors cursor-pointer"
                aria-label="Remove uploaded file"
              >
                ✕
              </button>
            </div>
          ) : (
            <label
              htmlFor="cv-upload-input"
              className="cursor-pointer block space-y-1.5"
            >
              <DocumentTextIcon className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground mx-auto" />
              <p className="font-sans text-xs sm:text-sm font-bold text-foreground">
                Click to browse or drag and drop your CV PDF
              </p>
              <p className="font-meta text-[10px] sm:text-[11px] text-muted-foreground">
                PDF format only (up to 5MB). Processed strictly in memory.
              </p>
            </label>
          )}
        </div>
      </div>

      {/* 2. Job Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="jd-textarea"
            className="block font-meta text-xs font-bold uppercase tracking-wider text-foreground"
          >
            2. Paste Job Description <span className="text-alert">*</span>
          </label>
          <span className="font-meta text-[10px] sm:text-[11px] text-muted-foreground">
            {jobDescription.trim().length} / 50 min characters
          </span>
        </div>

        <textarea
          id="jd-textarea"
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the target job description (role overview, responsibilities, technical requirements, qualifications, and company domain)..."
          className="w-full rounded-control border-2 border-border bg-surface-raised p-2.5 sm:p-3 font-sans text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary transition-colors resize-y min-h-22.5"
        />
      </div>

      {/* 3. Privacy Assurance Callout */}
      <div className="rounded-control bg-surface-raised border border-border/20 p-2.5 sm:p-3">
        <p className="font-meta text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
          🔒 <strong>Privacy Assurance:</strong> Your CV is parsed strictly
          in-memory and never stored on disk or in the database. The AI
          interviewer grounds all questions exclusively in facts supported by
          your CV and target job description.
        </p>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-control bg-surface-raised border border-border font-meta text-xs font-bold uppercase text-foreground hover:bg-surface-subtle transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!cvFile || jobDescription.trim().length < 50}
          className="inline-flex items-center justify-center gap-2 rounded-control bg-primary px-5 py-2.5 sm:px-6 sm:py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50 text-center"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          <span>Generate Interview Scenario</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}
