import { extractText } from "unpdf";

export const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MIN_CV_TEXT_CHARS = 50;
export const MAX_CV_TEXT_CHARS = 50_000;

export class CvParserError extends Error {
  readonly code: "VALIDATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "CvParserError";
    this.code = "VALIDATION_FAILED";
  }
}

export interface ParseCvOptions {
  maxBytes?: number;
  minChars?: number;
  maxChars?: number;
}

export interface ParsedCvResult {
  text: string;
}

/**
 * Parses a PDF CV purely in-memory from a Buffer.
 * Never writes the file or extracted text to disk or database.
 */
export async function parsePdfCvFromBuffer(
  buffer: Buffer,
  mimeType: string,
  options: ParseCvOptions = {},
): Promise<ParsedCvResult> {
  const maxBytes = options.maxBytes ?? MAX_CV_FILE_SIZE_BYTES;
  const minChars = options.minChars ?? MIN_CV_TEXT_CHARS;
  const maxChars = options.maxChars ?? MAX_CV_TEXT_CHARS;

  const normalizedMime = mimeType.split(";")[0]?.trim().toLowerCase();
  if (normalizedMime !== "application/pdf") {
    throw new CvParserError("Only PDF files are supported for CV upload.");
  }

  if (!buffer || buffer.length === 0) {
    throw new CvParserError("CV file buffer is empty.");
  }

  if (buffer.length > maxBytes) {
    throw new CvParserError(
      `CV file exceeds the maximum allowed size of ${Math.round(maxBytes / (1024 * 1024))}MB.`,
    );
  }

  // Check PDF magic bytes (%PDF-)
  const magic = buffer.subarray(0, 5).toString("ascii");
  if (!magic.startsWith("%PDF-")) {
    throw new CvParserError("Invalid PDF document format.");
  }

  let rawExtractedText = "";
  try {
    const uint8Array = new Uint8Array(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    const result = await extractText(uint8Array);
    rawExtractedText = Array.isArray(result.text)
      ? result.text.join("\n")
      : (result.text ?? "");
  } catch {
    throw new CvParserError(
      "Unable to read text from the uploaded PDF document. Please ensure the PDF is not encrypted or corrupted.",
    );
  }

  // Normalize extracted text
  const normalizedText = rawExtractedText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (normalizedText.length < minChars) {
    throw new CvParserError(
      "The uploaded PDF CV does not contain sufficient readable text. Please upload a text-based PDF CV rather than a scanned image.",
    );
  }

  const boundedText =
    normalizedText.length > maxChars
      ? normalizedText.slice(0, maxChars).trim()
      : normalizedText;

  return {
    text: boundedText,
  };
}
