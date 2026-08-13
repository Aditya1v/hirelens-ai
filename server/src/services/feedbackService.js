// ---------------------------------------------------------------------------
// feedbackService.js
//
// Generates the category-scored feedback object (ATS, toneAndStyle,
// content, structure, skills) that the existing UI components (Summary,
// ATS, Details) already know how to render. The shape is intentionally
// kept identical to the original frontend's `Feedback` type so no UI
// changes were needed - only where this data comes from changed (backend
// LLM call instead of a direct client-side Puter call).
// ---------------------------------------------------------------------------

import { callJSON } from "./llmService.js";

const FEEDBACK_SYSTEM_PROMPT = `You are an expert technical resume reviewer and ATS (Applicant Tracking
System) simulator. You evaluate resumes strictly based on the text given to
you. You never invent skills, employers, achievements, or qualifications
that are not present in the resume text. Every "tip" you write must be
traceable to something actually observable in the given resume text (either
present and done well, or a specific gap/weakness you can point to).`;

function buildFeedbackPrompt({ resumeText, jobTitle, jobDescription }) {
  const jdBlock = jobDescription
    ? `\nTARGET JOB TITLE: ${jobTitle || "(not specified)"}\nJOB DESCRIPTION:\n"""\n${jobDescription.slice(0, 6000)}\n"""\n`
    : "\n(No specific job description was provided - evaluate generally for ATS/recruiter readiness.)\n";

  return `Evaluate the resume text below and return a single JSON object with EXACTLY this shape:

{
  "overallScore": number (0-100),
  "ATS": { "score": number (0-100), "tips": [{ "type": "good"|"improve", "tip": string }] },
  "toneAndStyle": { "score": number (0-100), "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "content": { "score": number (0-100), "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "structure": { "score": number (0-100), "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] },
  "skills": { "score": number (0-100), "tips": [{ "type": "good"|"improve", "tip": string, "explanation": string }] }
}

Guidance:
- ATS.tips: 2-3 tips about parseability/format/keyword alignment (ATS.tips do NOT need "explanation", just "type" and "tip").
- toneAndStyle.tips, content.tips, structure.tips, skills.tips: 2-3 tips each, mix of "good" (things done well) and "improve" (specific, actionable), each with a short "explanation" grounded in the actual resume text.
- Scores should meaningfully differ based on resume quality - do not default everything to the same number.
- overallScore should be a reasonable weighted impression of the five category scores, not just their average.
${jdBlock}
RESUME TEXT:
"""
${resumeText.slice(0, 6000)}
"""`;
}

/**
 * generateFeedback({ resumeText, jobTitle, jobDescription })
 * Returns a validated Feedback object. On AI failure, throws (the caller
 * marks the Analysis as "failed" rather than silently faking scores, since
 * fabricated scores would be worse than a visible error state).
 */
export async function generateFeedback({ resumeText, jobTitle, jobDescription }) {
  const raw = await callJSON({
    system: FEEDBACK_SYSTEM_PROMPT,
    user: buildFeedbackPrompt({ resumeText, jobTitle, jobDescription }),
    maxTokens: 1800,
  });

  return sanitizeFeedback(raw);
}

function clampScore(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function sanitizeTips(tips, requireExplanation) {
  if (!Array.isArray(tips)) return [];
  return tips
    .filter((t) => t && typeof t.tip === "string")
    .slice(0, 6)
    .map((t) => ({
      type: t.type === "good" ? "good" : "improve",
      tip: String(t.tip).slice(0, 300),
      ...(requireExplanation ? { explanation: String(t.explanation || "").slice(0, 500) } : {}),
    }));
}

function sanitizeCategory(cat, requireExplanation) {
  return {
    score: clampScore(cat?.score),
    tips: sanitizeTips(cat?.tips, requireExplanation),
  };
}

function sanitizeFeedback(raw) {
  return {
    overallScore: clampScore(raw?.overallScore),
    ATS: sanitizeCategory(raw?.ATS, false),
    toneAndStyle: sanitizeCategory(raw?.toneAndStyle, true),
    content: sanitizeCategory(raw?.content, true),
    structure: sanitizeCategory(raw?.structure, true),
    skills: sanitizeCategory(raw?.skills, true),
  };
}
