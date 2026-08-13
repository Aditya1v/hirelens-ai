// ---------------------------------------------------------------------------
// pdfService.js
//
// Extracts raw text from an uploaded PDF resume server-side. This replaces
// the original design where the whole PDF was sent client-side to the AI
// provider - now only the extracted text (and later, the file itself for
// storage) touches the backend, and the AI key never reaches the browser.
// ---------------------------------------------------------------------------

import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { AppError } from "../utils/AppError.js";

/**
 * extractTextFromPdf(buffer)
 * Returns the concatenated text content of a PDF buffer. Throws a 400
 * AppError if the PDF has no extractable text (e.g. a scanned image PDF),
 * since every downstream feature (extraction, scoring, matching) needs text.
 */
export async function extractTextFromPdf(buffer) {
  let result;
  try {
    result = await pdfParse(buffer);
  } catch (err) {
    throw new AppError("Could not read the PDF file. It may be corrupted.", 400);
  }

  const text = (result.text || "").trim();
  if (text.length < 50) {
    throw new AppError(
      "No readable text found in this PDF. Scanned/image-only resumes aren't supported yet - please upload a text-based PDF.",
      400
    );
  }

  return text;
}
