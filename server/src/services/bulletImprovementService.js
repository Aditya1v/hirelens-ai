// ---------------------------------------------------------------------------
// bulletImprovementService.js
//
// Powers the "AI bullet-point improvement" feature: given one resume bullet
// (as written by the user) plus resume context, returns 2-3 rewritten
// versions that apply the action-verb + quantified-result pattern - without
// inventing numbers or scope the user never mentioned.
// ---------------------------------------------------------------------------

import { callJSON } from "./llmService.js";

const SYSTEM_PROMPT = `You rewrite resume bullet points to be more specific, active, and impact-
oriented. You NEVER invent metrics, numbers, team sizes, or outcomes that
are not implied by the original bullet or the surrounding resume context.
If the original bullet has no quantifiable result, improve its clarity,
verb strength, and specificity instead of fabricating a number - you may
add a bracketed placeholder like "[quantify: e.g. % or count]" to prompt
the user to fill in a real number themselves, rather than inventing one.`;

function buildPrompt({ bullet, resumeContext, jobTitle }) {
  return `Original bullet point:
"""
${bullet}
"""

Resume context (for tone/consistency only - do not copy unrelated facts into the bullet):
"""
${resumeContext.slice(0, 3000)}
"""

Target role (if relevant): ${jobTitle || "(not specified)"}

Return a JSON object:
{
  "improved": string[],   // 2-3 improved rewrites of the ORIGINAL bullet only
  "rationale": string     // one sentence on what changed and why
}`;
}

/**
 * improveBullet({ bullet, resumeContext, jobTitle })
 * Returns { improved: string[], rationale: string }.
 */
export async function improveBullet({ bullet, resumeContext, jobTitle }) {
  const raw = await callJSON({
    system: SYSTEM_PROMPT,
    user: buildPrompt({ bullet, resumeContext, jobTitle }),
    maxTokens: 600,
  });

  const improved = Array.isArray(raw?.improved)
    ? raw.improved.filter((s) => typeof s === "string" && s.trim()).slice(0, 3)
    : [];

  return {
    improved,
    rationale: typeof raw?.rationale === "string" ? raw.rationale.slice(0, 300) : "",
  };
}
