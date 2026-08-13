// ---------------------------------------------------------------------------
// matchService.js
//
// Produces the hybrid job-match score: a weighted blend of
//   - semanticScore: cosine similarity between resume-embedding and
//     job-description-embedding (catches paraphrased/conceptual overlap)
//   - keywordScore: literal skill/tech term overlap (catches exact ATS
//     keyword matching, which pure semantic similarity can miss)
// plus skill-gap analysis (matched / missing / high-priority-missing).
// ---------------------------------------------------------------------------

import { embedText, cosineSimilarity } from "./embeddingService.js";
import { keywordMatchScore, extractKeywords } from "./keywordService.js";

const SEMANTIC_WEIGHT = 0.6;
const KEYWORD_WEIGHT = 0.4;

/**
 * computeJobMatch({ resumeText, resumeEmbedding, structuredData, jobDescription })
 * Returns { jobMatchScore, semanticScore, keywordScore, matchedSkills,
 *           missingSkills, priorityMissingSkills }
 */
export async function computeJobMatch({ resumeText, resumeEmbedding, structuredData, jobDescription }) {
  if (!jobDescription || jobDescription.trim().length < 20) {
    return {
      jobMatchScore: null,
      semanticScore: null,
      keywordScore: null,
      matchedSkills: [],
      missingSkills: [],
      priorityMissingSkills: [],
    };
  }

  const jdEmbedding = await embedText(jobDescription);
  const semanticScore = Math.round(cosineSimilarity(resumeEmbedding, jdEmbedding) * 100);

  const resumeSkillTokens = [
    ...(structuredData?.skills || []),
    ...(structuredData?.technologies || []),
  ];
  const { score: keywordScore, matched, missing } = keywordMatchScore(jobDescription, resumeSkillTokens);

  const jobMatchScore = Math.round(SEMANTIC_WEIGHT * semanticScore + KEYWORD_WEIGHT * keywordScore);

  const priorityMissingSkills = rankPriorityMissing(missing, jobDescription);

  return {
    jobMatchScore,
    semanticScore,
    keywordScore,
    matchedSkills: matched,
    missingSkills: missing,
    priorityMissingSkills,
  };
}

// Heuristic: a missing skill is "high priority" if it appears more than
// once in the JD, or appears within the first third of the JD text (where
// job descriptions typically list core/must-have requirements first).
function rankPriorityMissing(missingSkills, jobDescription) {
  const lower = jobDescription.toLowerCase();
  const firstThird = lower.slice(0, Math.ceil(lower.length / 3));

  const scored = missingSkills.map((skill) => {
    const occurrences = lower.split(skill).length - 1;
    const earlyMention = firstThird.includes(skill);
    return { skill, weight: occurrences + (earlyMention ? 1 : 0) };
  });

  return scored
    .filter((s) => s.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map((s) => s.skill);
}

export { extractKeywords };
