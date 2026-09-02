"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import {
  AlertTriangleIcon,
  CloseIcon,
  DocumentTextIcon,
  RefreshIcon,
  SparklesIcon,
} from "@/components/icons";
import { createApiClient } from "@/lib/api-client";
import {
  formatWhatsAppUrl,
  PRICING_PLANS,
  WHATSAPP_PHONE_NUMBER,
} from "@/lib/pricing-config";

export interface CreateCustomScenarioDialogProps {
  open: boolean;
  onClose: () => void;
  userEffectivePlan?: "FREE" | "PLUS" | "PRO";
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function CreateCustomScenarioDialog({
  open,
  onClose,
  userEffectivePlan = "FREE",
}: CreateCustomScenarioDialogProps) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFreePlan = userEffectivePlan === "FREE";
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSubmitting || isFreePlan) return;

    if (!cvFile) {
      setError("Please select or upload your CV in PDF format.");
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
      setIsSubmitting(true);
      setError(null);

      const token = await getToken();
      if (!token)
        throw new Error(
          "Authentication token is unavailable. Please sign in again.",
        );

      const client = createApiClient(apiUrl);
      const createdScenario = await client.createCustomScenario(
        token,
        cvFile,
        trimmedJd,
      );

      onClose();
      router.push(`/app/scenarios/${encodeURIComponent(createdScenario.key)}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate custom interview scenario. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-scenario-title"
        tabIndex={-1}
        className="w-full max-w-xl rounded-card border-2 border-border bg-surface-solid p-6 sm:p-8 shadow-brutal outline-none my-8"
      >
        <div className="flex items-center justify-between pb-4 border-b border-border/20 mb-6">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-control bg-primary text-primary-foreground">
              <SparklesIcon className="w-5 h-5" />
            </span>
            <div>
              <h2
                id="custom-scenario-title"
                className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground"
              >
                Create Custom Interview
              </h2>
              <p className="font-meta text-xs text-muted-foreground uppercase tracking-wider">
                Tailored AI Roleplay & Rubrics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-control text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Close dialog"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {isFreePlan ? (
          <div className="space-y-6">
            <div className="rounded-control border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold font-display text-sm uppercase tracking-wide">
                <SparklesIcon className="w-4 h-4" />
                <span>Plus & Pro Plan Exclusive</span>
              </div>
              <p className="font-sans text-sm text-foreground/80 leading-relaxed">
                Custom interview scenario generation is available exclusively on{" "}
                <strong className="text-foreground">Plus</strong> and{" "}
                <strong className="text-foreground">Pro</strong> plans. Upload
                your CV and target Job Description to generate personalized
                interview rehearsals grounded strictly in your real background.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={formatWhatsAppUrl(
                  WHATSAPP_PHONE_NUMBER,
                  PRICING_PLANS[1]!.whatsappMessage ??
                    "Hi, I would like to upgrade to the Kalemny Plus plan.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground border border-border shadow-[4px_4px_0px_0px_#1a1a1a] hover:shadow-[2px_2px_0px_0px_#1a1a1a] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
              >
                Upgrade to Plus ($15/mo)
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-control bg-surface-raised border border-border font-meta text-xs font-bold uppercase text-foreground hover:bg-surface-subtle transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-control border-2 border-alert bg-alert/10 p-4 font-sans text-xs text-alert flex items-start gap-2.5 shadow-xs"
              >
                <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. CV Upload */}
            <div className="space-y-2">
              <label
                htmlFor="cv-upload-input"
                className="block font-meta text-xs font-bold uppercase tracking-wider text-foreground"
              >
                1. Upload Candidate CV (PDF){" "}
                <span className="text-alert">*</span>
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-control p-5 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : cvFile
                      ? "border-success bg-success/5"
                      : "border-border/60 hover:border-border bg-surface-raised"
                }`}
              >
                <input
                  id="cv-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  disabled={isSubmitting}
                  className="sr-only"
                />

                {cvFile ? (
                  <div className="flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DocumentTextIcon className="w-6 h-6 text-success shrink-0" />
                      <div className="min-w-0">
                        <p className="font-sans text-sm font-bold text-foreground truncate">
                          {cvFile.name}
                        </p>
                        <p className="font-meta text-xs text-muted-foreground">
                          {(cvFile.size / 1024).toFixed(1)} KB (PDF)
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCvFile(null)}
                      disabled={isSubmitting}
                      className="p-1 text-muted-foreground hover:text-alert transition-colors"
                      aria-label="Remove uploaded file"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="cv-upload-input"
                    className="cursor-pointer block space-y-2"
                  >
                    <DocumentTextIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="font-sans text-xs sm:text-sm font-bold text-foreground">
                      Click to browse or drag and drop your CV PDF
                    </p>
                    <p className="font-meta text-[11px] text-muted-foreground">
                      PDF format only (up to 5MB). Processed in memory only.
                    </p>
                  </label>
                )}
              </div>
            </div>

            {/* 2. Job Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="jd-textarea"
                  className="block font-meta text-xs font-bold uppercase tracking-wider text-foreground"
                >
                  2. Paste Job Description <span className="text-alert">*</span>
                </label>
                <span className="font-meta text-[11px] text-muted-foreground">
                  {jobDescription.trim().length} / 50 min chars
                </span>
              </div>

              <textarea
                id="jd-textarea"
                rows={5}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Paste the full job description (role overview, responsibilities, technical requirements, qualifications, and company domain)..."
                className="w-full rounded-control border-2 border-border bg-surface-raised p-3 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary transition-colors resize-y"
              />
            </div>

            {/* Privacy Guarantee Note */}
            <div className="rounded-control bg-surface-raised border border-border/20 p-3">
              <p className="font-meta text-[11px] text-muted-foreground leading-relaxed">
                🔒 <strong>Privacy Assurance:</strong> Your CV is parsed
                in-memory and is never stored on disk or in the database. AI
                generation relies strictly on facts in your CV and JD.
              </p>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-control bg-surface-raised border border-border font-meta text-xs font-bold uppercase text-foreground hover:bg-surface-subtle transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting || !cvFile || jobDescription.trim().length < 50
                }
                className="inline-flex items-center gap-2 rounded-control bg-primary px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground border border-border brutalist-interactive cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span>Generating Scenario...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    <span>Generate Scenario</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
