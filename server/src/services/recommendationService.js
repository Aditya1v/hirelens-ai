// ---------------------------------------------------------------------------
// recommendationService.js
//
// Generates resume improvement recommendations that are:
//   1. Grounded in retrieved knowledge-base context (RAG) - so advice like
//      "quantify your bullets" is backed by an actual best-practice chunk,
//      not just the model's unconstrained opinion.
//   2. Grounded in evidence from the user's own resume - every suggestion
//      must reference something actually present in the resume text.
//
// Hallucination safeguard: after generation, each recommendation's
// "evidence" field is checked against the resume's raw text/structured
// data. Recommendations whose evidence can't be located in the resume are
// dropped rather than shown, since an unverifiable "evidence" claim is a
// sign the model may have invented detail.
// ---------------------------------------------------------------------------

import { callJSON } from "./llmService.js";
import { retrieveContext } from "./ragService.js";

const RECOMMENDATION_SYSTEM_PROMPT = `You are a resume coach. You give specific, actionable recommendations based
ONLY on: (a) the resume text provided, (b) the job description provided, and
(c) the best-practice context chunks provided. You NEVER invent skills,
employers, metrics, or experience the candidate does not have. If you
suggest quantifying a bullet, you must reference the ACTUAL bullet text from
the resume, not a hypothetical one. Every recommendation must include an
"evidence" field quoting or closely paraphrasing the specific resume text it
is based on (or, for a missing-skill gap, the word "gap" if there is no
resume text to reference).`;

function buildPrompt({ resumeText, jobTitle, jobDescription, missingSkills, kbContext }) {
  const kbBlock = kbContext.map((c) => `- (${c.topic}) ${c.text}`).join("\n");
  return `Given the resume, job context, and best-practice context below, return a JSON array of 4-7 recommendation objects, each shaped:

{ "area": string, "suggestion": string, "evidence": string, "source": "resume" | "knowledge_base" | "job_description" }

Rules:
- "area" is a short label like "Experience", "Skills", "Summary", "Formatting".
- "suggestion" is one specific, actionable sentence.
- "evidence" MUST be a short quote or close paraphrase of actual resume text that motivates the suggestion. If the recommendation is about a missing skill with no resume evidence, set "evidence" to "gap: <skill>" and "source" to "job_description".
- Do not repeat the same area more than twice.
- Ground at least 2 suggestions in the BEST-PRACTICE CONTEXT below (set "source": "knowledge_base" for those, and still tie "evidence" to what part of the resume it applies to).

TARGET JOB TITLE: ${jobTitle || "(not specified)"}

MISSING SKILLS (from job description, not found in resume): ${missingSkills.length ? missingSkills.join(", ") : "(none identified)"}

BEST-PRACTICE CONTEXT:
${kbBlock || "(none retrieved)"}

RESUME TEXT:
"""
${resumeText.slice(0, 10000)}
"""

JOB DESCRIPTION:
"""
${(jobDescription || "").slice(0, 4000)}
"""`;
}

/**
 * retrieveRecommendationContext({ jobTitle, jobDescription })
 * Kicks off the RAG retrieval step independently of skill-gap analysis, so
 * callers can run it in parallel with feedback/match generation instead of
 * waiting for match.missingSkills first - shaves one embedding-lookup
 * round-trip off the critical path of every analysis request.
 */
export async function retrieveRecommendationContext({ jobTitle, jobDescription }) {
  const query = `${jobTitle || ""} ${jobDescription || ""} resume improvement ATS best practice`.trim();
  return retrieveContext(query || "resume ATS best practice", 4);
}

/**
 * generateRecommendations({ resumeText, jobTitle, jobDescription, missingSkills, kbContext? })
 * Runs the generation + hallucination-filter pipeline and returns a
 * validated recommendations array (possibly empty on failure -
 * recommendations are a value-add, not a blocker, so failures here don't
 * fail the whole analysis). Accepts a pre-fetched `kbContext` (from
 * retrieveRecommendationContext) to avoid a redundant retrieval call when
 * the caller already ran it in parallel.
 */
export async function generateRecommendations({
  resumeText,
  jobTitle,
  jobDescription,
  missingSkills = [],
  kbContext: precomputedContext,
}) {
  try {
    const kbContext =
      precomputedContext || (await retrieveRecommendationContext({ jobTitle, jobDescription }));

    const raw = await callJSON({
      system: RECOMMENDATION_SYSTEM_PROMPT,
      user: buildPrompt({ resumeText, jobTitle, jobDescription, missingSkills, kbContext }),
      maxTokens: 1800,
    });

    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.recommendations) ? raw.recommendations : [];
    return verifyGrounding(list, resumeText, missingSkills);
  } catch (err) {
    console.error("[recommendationService] generation failed:", err.message);
    return [];
  }
}

/**
 * verifyGrounding
 * The hallucination guard: keeps a recommendation only if its "evidence"
 * either (a) is explicitly a flagged skill gap ("gap: ..."), or (b) has
 * meaningful textual overlap with the actual resume. This is a lightweight
 * lexical check (not perfect) but reliably catches fabricated evidence that
 * shares no words at all with the source resume.
 */
function verifyGrounding(list, resumeText, missingSkills) {
  const resumeLower = resumeText.toLowerCase();
  const missingLower = missingSkills.map((s) => s.toLowerCase());

  return list
    .filter((r) => r && typeof r.suggestion === "string" && typeof r.evidence === "string")
    .filter((r) => {
      const evidenceLower = r.evidence.toLowerCase();

      if (evidenceLower.startsWith("gap:")) {
        const skill = evidenceLower.replace("gap:", "").trim();
        return missingLower.some((m) => skill.includes(m) || m.includes(skill));
      }

      // Require at least one meaningful (4+ char) word from the evidence
      // to actually appear in the resume text.
      const words = evidenceLower.match(/[a-z0-9]{4,}/g) || [];
      return words.some((w) => resumeLower.includes(w));
    })
    .slice(0, 7)
    .map((r) => ({
      area: String(r.area || "General").slice(0, 60),
      suggestion: String(r.suggestion).slice(0, 400),
      evidence: String(r.evidence).slice(0, 300),
      source: ["resume", "knowledge_base", "job_description"].includes(r.source) ? r.source : "resume",
    }));
}
