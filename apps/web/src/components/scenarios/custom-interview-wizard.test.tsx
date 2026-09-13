// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicScenarioDetail } from "@kalemny/contracts";

import { LocaleProvider } from "@/lib/locale-context";
import { CustomInterviewWizard } from "./custom-interview-wizard";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    getToken: vi.fn().mockResolvedValue("test-token"),
    isLoaded: true,
    isSignedIn: true,
  }),
}));

const mockCreateCustomScenario = vi.fn();
const mockCreateAttempt = vi.fn();

vi.mock("@/lib/api-client", () => ({
  createApiClient: () => ({
    createCustomScenario: mockCreateCustomScenario,
    createAttempt: mockCreateAttempt,
  }),
}));

const mockGeneratedScenario: PublicScenarioDetail = {
  key: "custom-senior-frontend-engineer",
  version: 1,
  title: "Senior Frontend Engineer Interview",
  titleAr: "مقابلة مهندس واجهات أمامية أول",
  category: "CUSTOM",
  isCustom: true,
  summary:
    "Technical and behavioral interview for Senior Frontend Engineer role at Acme Corp.",
  summaryAr:
    "مقابلة تقنية وسلوكية لدور مهندس واجهات أمامية أول في شركة أكمي.",
  availableDifficulties: ["EASY", "MEDIUM", "HARD"],
  context: {
    description: "You are interviewing for a Senior Frontend Engineer position.",
    descriptionAr: "تجري مقابلة لوظيفة مهندس واجهات أمامية أول.",
    userRole: "Senior Frontend Candidate",
    userRoleAr: "مرشح لوظيفة مهندس واجهات أول",
    aiRole: "Engineering Director",
    aiRoleAr: "مدير الهندسة البرمجية",
    userObjective:
      "Demonstrate architecture expertise, team mentorship, and clear technical communication.",
    userObjectiveAr:
      "إظهار خبرتك المعمارية ومهارات التوجيه والتواصل التقني الواضح.",
    stakes: "Securing a senior technical offer with competitive compensation.",
    stakesAr: "الحصول على عرض عمل تقني رفيع بحزمة مزايا تنافسية.",
  },
};

const VALID_JD =
  "We are seeking an experienced Senior Frontend Engineer to lead React architecture, mentor junior engineers, and drive technical roadmaps across core products.";

describe("CustomInterviewWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCustomScenario.mockResolvedValue(mockGeneratedScenario);
    mockCreateAttempt.mockResolvedValue({ id: "attempt-custom-123" });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. rejects non-PDF files and oversized files (> 5MB)", () => {
    render(<CustomInterviewWizard />);

    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    expect(fileInput).toBeDefined();

    // 1a. Test non-PDF file
    const txtFile = new File(["dummy plain text content"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(
      screen.getByText(/only pdf files are supported/i),
    ).toBeDefined();

    // 1b. Test oversized file (> 5MB)
    const largePdf = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      "huge-resume.pdf",
      { type: "application/pdf" },
    );
    fireEvent.change(fileInput, { target: { files: [largePdf] } });

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/exceeds the 5mb size limit/i)).toBeDefined();

    // 1c. Test valid PDF file
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("candidate-cv.pdf")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /remove uploaded file/i }),
    ).toBeDefined();
  });

  it("2. validates job description character minimum (>= 50 characters)", () => {
    render(<CustomInterviewWizard />);

    // Upload valid PDF first
    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    const submitBtn = screen.getByRole("button", {
      name: /create personalized interview/i,
    });

    // Too short (< 50 chars)
    fireEvent.change(textarea, { target: { value: "Short description" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText(/17 \/ 50 min chars/i)).toBeDefined();

    // Valid length (>= 50 chars)
    fireEvent.change(textarea, { target: { value: VALID_JD } });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(new RegExp(`${VALID_JD.length} / 50 min chars`))).toBeDefined();
  });

  it("3. renders generating state with loading message", async () => {
    // Keep creation pending to verify loading UI
    let resolveCreation: (value: PublicScenarioDetail) => void;
    mockCreateCustomScenario.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreation = resolve;
        }),
    );

    render(<CustomInterviewWizard />);

    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: VALID_JD } });

    const submitBtn = screen.getByRole("button", {
      name: /create personalized interview/i,
    });
    fireEvent.click(submitBtn);

    // Verify generating loading state
    await waitFor(() => {
      expect(screen.getByRole("status")).toBeDefined();
    });
    expect(
      screen.getByText(/preparing your personalized interview/i),
    ).toBeDefined();
    expect(
      screen.getByText(/parsing your candidate cv in memory/i),
    ).toBeDefined();
    expect(
      screen.getByText(/in-memory parsing & zero file storage/i),
    ).toBeDefined();

    // Wait for client method call, then resolve scenario creation
    await waitFor(() => {
      expect(mockCreateCustomScenario).toHaveBeenCalled();
    });
    resolveCreation!(mockGeneratedScenario);
    await waitFor(() => {
      expect(screen.getByText("Senior Frontend Engineer Interview")).toBeDefined();
    });
  });

  it("4. renders practice configuration controls (Difficulty, Language/Dialect, Mode) in review step", async () => {
    render(<CustomInterviewWizard />);

    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: VALID_JD } });

    const submitBtn = screen.getByRole("button", {
      name: /create personalized interview/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Senior Frontend Engineer Interview"),
      ).toBeDefined();
    });

    // Parsed scenario details
    expect(
      screen.getByText(
        "Technical and behavioral interview for Senior Frontend Engineer role at Acme Corp.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Senior Frontend Candidate")).toBeDefined();
    expect(screen.getByText("Engineering Director")).toBeDefined();
    expect(
      screen.getByText(
        "Demonstrate architecture expertise, team mentorship, and clear technical communication.",
      ),
    ).toBeDefined();

    // Configuration controls
    // 1. Difficulty: Medium selected by default
    const mediumDiffBtn = screen.getByRole("button", { name: /medium/i });
    expect(mediumDiffBtn).toBeDefined();
    expect(mediumDiffBtn.getAttribute("aria-pressed")).toBe("true");

    // 2. Language: English selected by default
    const englishBtn = screen.getByRole("button", { name: /^english/i });
    expect(englishBtn).toBeDefined();
    expect(englishBtn.getAttribute("aria-pressed")).toBe("true");

    // 3. Practice Mode: Push-to-Talk selected by default
    const pttBtn = screen.getByRole("button", { name: /push-to-talk/i });
    expect(pttBtn).toBeDefined();
    expect(pttBtn.getAttribute("aria-pressed")).toBe("true");

    // Testing policy note
    expect(
      screen.getByText(
        "Generating this interview is free. Starting practice consumes 1 of your weekly sessions.",
      ),
    ).toBeDefined();

    // Start action button
    expect(
      screen.getByRole("button", { name: /start interview practice/i }),
    ).toBeDefined();
  });

  it("5. dispatches createAttempt with chosen configuration upon clicking start button", async () => {
    const onSuccessStart = vi.fn();
    render(<CustomInterviewWizard onSuccessStart={onSuccessStart} />);

    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: VALID_JD } });

    fireEvent.click(
      screen.getByRole("button", { name: /create personalized interview/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Senior Frontend Engineer Interview"),
      ).toBeDefined();
    });

    // 1. Change Difficulty to HARD
    const hardDiffBtn = screen.getByRole("button", { name: /hard/i });
    fireEvent.click(hardDiffBtn);
    expect(hardDiffBtn.getAttribute("aria-pressed")).toBe("true");

    // 2. Change Language to Arabic
    const arabicBtn = screen.getByRole("button", { name: /العربية/i });
    fireEvent.click(arabicBtn);
    expect(arabicBtn.getAttribute("aria-pressed")).toBe("true");

    // 3. Select Gulf Dialect
    const gulfDialectBtn = screen.getByRole("button", {
      name: /لهجة خليجية/i,
    });
    fireEvent.click(gulfDialectBtn);
    expect(gulfDialectBtn.getAttribute("aria-pressed")).toBe("true");

    // 4. Change Practice Mode to REALTIME (Live Call)
    const realtimeModeBtn = screen.getByRole("button", {
      name: /live call|مكالمة صوتية مباشرة/i,
    });
    fireEvent.click(realtimeModeBtn);
    expect(realtimeModeBtn.getAttribute("aria-pressed")).toBe("true");

    // 5. Click Start Interview Practice
    const startBtn = screen.getByRole("button", {
      name: /start interview practice/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(mockCreateAttempt).toHaveBeenCalledTimes(1);
      expect(mockCreateAttempt).toHaveBeenCalledWith("test-token", {
        scenarioKey: "custom-senior-frontend-engineer",
        difficulty: "HARD",
        language: "ar",
        dialect: "GULF",
        interactionMode: "REALTIME",
        retryOfAttemptId: null,
      });
      expect(onSuccessStart).toHaveBeenCalledWith("attempt-custom-123");
    });
  });

  it("6. verifies Arabic localization when rendered in Arabic locale context", async () => {
    render(
      <LocaleProvider defaultLocale="ar">
        <CustomInterviewWizard />
      </LocaleProvider>,
    );

    // Arabic Step 1
    expect(screen.getByText(/1\. ارفع سيرتك الذاتية \(PDF\)/i)).toBeDefined();
    expect(
      screen.getByText(/اضغط لاختيار الملف أو اسحب وأفلت سيرتك الذاتية/i),
    ).toBeDefined();

    // Arabic Step 2
    expect(screen.getByText(/2\. أضف الوصف الوظيفي/i)).toBeDefined();

    // Upload and submit
    const fileInput = document.getElementById(
      "cv-upload-input",
    ) as HTMLInputElement;
    const validPdf = new File(["%PDF-1.4..."], "candidate-cv.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(fileInput, { target: { files: [validPdf] } });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: VALID_JD } });

    const submitBtn = screen.getByRole("button", {
      name: /إنشاء المقابلة المخصصة/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("مقابلة مهندس واجهات أمامية أول")).toBeDefined();
    });

    // Review step Arabic copy
    expect(screen.getByText("دورك")).toBeDefined();
    expect(
      screen.getByText("مرشح لوظيفة مهندس واجهات أول"),
    ).toBeDefined();
    expect(
      screen.getByText("دور المحاور (الذكاء الاصطناعي)"),
    ).toBeDefined();
    expect(screen.getByText("الهدف الأساسي")).toBeDefined();
    expect(
      screen.getByText(
        "إظهار خبرتك المعمارية ومهارات التوجيه والتواصل التقني الواضح.",
      ),
    ).toBeDefined();

    // Arabic Testing Policy Note
    expect(
      screen.getByText(
        "إنشاء هذا السيناريو مجاني تماماً. بدء التدرّب يستهلك 1 من جلساتك الأسبوعية.",
      ),
    ).toBeDefined();

    // Arabic Start Action Button
    expect(
      screen.getByRole("button", { name: "ابدأ المقابلة المخصصة" }),
    ).toBeDefined();
  });
});
