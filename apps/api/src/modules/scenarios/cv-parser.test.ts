import { describe, expect, it } from "vitest";
import {
  CvParserError,
  MAX_CV_FILE_SIZE_BYTES,
  MIN_CV_TEXT_CHARS,
  parsePdfCvFromBuffer,
} from "./cv-parser.js";

// Minimal valid PDF containing text
function createMinimalPdfBuffer(textContent: string): Buffer {
  // A minimal valid single-page PDF with a text stream
  const contentStream = `BT /F1 12 Tf 50 700 Td (${textContent.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const streamLength = Buffer.byteLength(contentStream, "utf-8");

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300+00000 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
400
%%EOF`;

  return Buffer.from(pdfString, "utf-8");
}

describe("parsePdfCvFromBuffer", () => {
  it("rejects non-PDF mime types", async () => {
    const buffer = Buffer.from("%PDF-1.4 sample content", "utf-8");
    await expect(parsePdfCvFromBuffer(buffer, "image/png")).rejects.toThrow(
      CvParserError,
    );
    await expect(
      parsePdfCvFromBuffer(buffer, "image/png"),
    ).rejects.toHaveProperty("code", "VALIDATION_FAILED");
  });

  it("rejects empty buffers", async () => {
    await expect(
      parsePdfCvFromBuffer(Buffer.alloc(0), "application/pdf"),
    ).rejects.toThrow("CV file buffer is empty.");
  });

  it("rejects buffers exceeding max size", async () => {
    const fakeBuffer = Buffer.alloc(MAX_CV_FILE_SIZE_BYTES + 100);
    fakeBuffer.write("%PDF-", 0, "ascii");
    await expect(
      parsePdfCvFromBuffer(fakeBuffer, "application/pdf"),
    ).rejects.toThrow("exceeds the maximum allowed size");
  });

  it("rejects invalid magic bytes", async () => {
    const invalidBuffer = Buffer.from("NOT_A_PDF_DOCUMENT", "utf-8");
    await expect(
      parsePdfCvFromBuffer(invalidBuffer, "application/pdf"),
    ).rejects.toThrow("Invalid PDF document format.");
  });

  it("rejects PDF with insufficient text content", async () => {
    const shortPdf = createMinimalPdfBuffer("Hi");
    await expect(
      parsePdfCvFromBuffer(shortPdf, "application/pdf"),
    ).rejects.toThrow(
      "The uploaded PDF CV does not contain sufficient readable text",
    );
  });

  it("successfully parses valid PDF with sufficient text in memory", async () => {
    const longText =
      "Jane Doe is an experienced full-stack software engineer with 5 years of expertise in TypeScript, Node.js, React, and PostgreSQL database architecture. Led microservice migrations and performance optimizations.";
    const validPdf = createMinimalPdfBuffer(longText);

    const result = await parsePdfCvFromBuffer(validPdf, "application/pdf");
    expect(result.text).toContain("Jane Doe");
    expect(result.text).toContain("TypeScript");
    expect(result.text.length).toBeGreaterThanOrEqual(MIN_CV_TEXT_CHARS);
  });
});
