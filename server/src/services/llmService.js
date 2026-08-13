// ---------------------------------------------------------------------------
// llmService.js
//
// Thin wrapper around Google's Gemini API (free tier, no credit card, no
// expiry). All resume-processing prompts route through callJSON() below,
// which uses Gemini's native JSON response mode plus a defensive parse as
// a safety net (occasionally a model still wraps output in stray text).
//
// This is the ONLY place the Gemini API key is used - it never reaches the
// client, per the "sensitive operations stay server-side" requirement.
// ---------------------------------------------------------------------------

import { GoogleGenAI } from "@google/genai";
import { AppError } from "../utils/AppError.js";

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError("AI features are not configured on the server.", 503);
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return client;
}

/**
 * Fast structured-output Gemini call.
 *
 * These resume operations do not need deep reasoning.
 * We therefore use Gemini Flash-Lite + minimal thinking.
 */
export async function callJSON({ system, user, maxTokens = 1500 }) {
  const ai = getClient();

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: user,

        config: {
          systemInstruction: system,

          responseMimeType: "application/json",

          maxOutputTokens: maxTokens,

          thinkingConfig: {
            thinkingLevel: "minimal",
          },
        },
      });

      const raw = extractResponseText(response);

      if (!raw) {
        const candidate = response?.candidates?.[0];

        console.error("[Gemini] Empty response", {
          attempt,
          model,
          finishReason: candidate?.finishReason,
          safetyRatings: candidate?.safetyRatings,
          candidateCount: response?.candidates?.length,
        });

        throw new Error(
          `Gemini returned an empty response (${candidate?.finishReason || "unknown reason"})`,
        );
      }

      return parseJSONLoose(raw);
    } catch (err) {
      lastError = err;

      console.error(`[Gemini] attempt ${attempt} failed:`, err?.message || err);

      if (attempt < 2) {
        await sleep(350);
      }
    }
  }

  throw new AppError(
    `AI service failed: ${lastError?.message || "Unknown Gemini error"}`,
    502,
  );
}

/**
 * Gemini can expose text through candidate parts even when
 * response.text is empty/unavailable.
 */
function extractResponseText(response) {
  if (typeof response?.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  const parts = response?.candidates?.[0]?.content?.parts || [];

  const text = parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  return text;
}

/**
 * Defensive JSON parser.
 */
function parseJSONLoose(raw) {
  let text = String(raw || "").trim();

  if (!text) {
    throw new Error("Gemini returned an empty JSON response.");
  }

  // Remove markdown fences.
  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // First try direct JSON.
  try {
    return JSON.parse(text);
  } catch {
    // Continue with extraction.
  }

  // Find first object/array.
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");

  let start;

  if (objectStart === -1) {
    start = arrayStart;
  } else if (arrayStart === -1) {
    start = objectStart;
  } else {
    start = Math.min(objectStart, arrayStart);
  }

  const objectEnd = text.lastIndexOf("}");
  const arrayEnd = text.lastIndexOf("]");

  const end = Math.max(objectEnd, arrayEnd);

  if (start !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);

    try {
      return JSON.parse(candidate);
    } catch {
      // fall through
    }
  }

  console.error("[Gemini] Unparseable response:", text.slice(0, 2000));

  throw new Error("Gemini returned invalid JSON.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
