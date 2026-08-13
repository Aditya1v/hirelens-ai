// ---------------------------------------------------------------------------
// extractionService.js
//
// Turns raw resume text into structured data (skills, education, experience,
// projects, certifications, technologies). This is what makes HireLens an
// "AI resume intelligence" tool rather than a keyword grep - downstream
// skill-gap analysis, semantic matching, and recommendations all read from
// this structured object instead of re-parsing free text each time.
// ---------------------------------------------------------------------------

import { callJSON } from "./llmService.js";

const EXTRACTION_SYSTEM_PROMPT = `You are a precise resume-parsing engine. You extract ONLY information that is
explicitly present in the resume text given to you. You never invent,
infer, or add skills, companies, degrees, or achievements that are not
literally stated in the text. If a section is absent, return an empty array
for it. Do not embellish or normalize company/school names beyond what is
written.`;

function buildExtractionPrompt(resumeText) {
  return `Extract structured data from the resume text below and return it as a single JSON object with EXACTLY this shape:

{
  "skills": string[],            // soft/hard skills explicitly stated (not tools)
  "technologies": string[],      // languages, frameworks, tools, platforms explicitly stated
  "education": [{ "degree": string, "institution": string, "year": string }],
  "experience": [{ "title": string, "company": string, "duration": string, "highlights": string[] }],
  "projects": [{ "name": string, "description": string, "technologies": string[] }],
  "certifications": string[]
}

Rules:
- Only include items literally present in the text below.
- "highlights" for each experience entry should be the resume's own bullet points, lightly cleaned (no invented content).
- If you are unsure whether something belongs in skills vs technologies, prefer technologies for anything that is a named tool/language/framework.
- Return [] for any array section that has no content in the resume.

RESUME TEXT:
"""
${resumeText.slice(0, 12000)}
"""`;
}

/**
 * extractResumeData(resumeText)
 * Returns the structured data object described above. Falls back to a
 * fully-empty-but-valid shape on any AI failure so upload doesn't hard-fail
 * just because structured extraction hiccuped - the raw text and file are
 * still saved either way.
 */
export async function extractResumeData(resumeText) {
  try {
    const result = await callJSON({
      system: EXTRACTION_SYSTEM_PROMPT,
      user: buildExtractionPrompt(resumeText),
      maxTokens: 2000,
    });

    return {
      skills: sanitizeStringArray(result.skills),
      technologies: sanitizeStringArray(result.technologies),
      education: Array.isArray(result.education) ? result.education.slice(0, 10) : [],
      experience: Array.isArray(result.experience) ? result.experience.slice(0, 15) : [],
      projects: Array.isArray(result.projects) ? result.projects.slice(0, 15) : [],
      certifications: sanitizeStringArray(result.certifications),
    };
  } catch (err) {
    console.error("[extractionService] extraction failed, saving empty structured data:", err.message);
    return { skills: [], technologies: [], education: [], experience: [], projects: [], certifications: [] };
  }
}

function sanitizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => typeof x === "string" && x.trim().length > 0).slice(0, 60);
}
