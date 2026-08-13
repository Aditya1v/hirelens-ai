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
    throw new AppError(
      "AI features are not configured on the server (missing GEMINI_API_KEY).",
      503
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * callJSON({ system, user, maxTokens })
 * Sends a single-turn prompt using Gemini's native JSON response mode
 * (responseMimeType: "application/json") and parses the result. Throws
 * AppError(502) on unparseable output so callers can surface a clean "AI
 * service" error instead of crashing on a malformed response.
 */
export async function callJSON({ system, user, maxTokens = 2000 }) {
  const ai = getClient();
  // "gemini-flash-latest" is an alias Google keeps pointed at the current
  // default Flash model, so this doesn't break again on the next model
  // deprecation the way a pinned "gemini-2.5-flash" did. Pin to a specific
  // stable model instead (e.g. "gemini-2.5-flash-lite") if you want
  // reproducible behavior across Google's model updates.
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const response = await ai.models.generateContent({
    model,
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
    },
  });

  const raw = response.text ?? "";
  return parseJSONLoose(raw);
}

// Strips common wrapping artifacts (```json fences, leading/trailing prose)
// before parsing, then throws a clean error if it still isn't valid JSON.
// Kept as a safety net even with native JSON mode enabled.
function parseJSONLoose(raw) {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const firstBrace = Math.min(
    ...[text.indexOf("{"), text.indexOf("[")].filter((i) => i !== -1)
  );
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));

  if (firstBrace !== Infinity && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AppError("AI service returned an unparseable response. Please try again.", 502);
  }
}
