// ---------------------------------------------------------------------------
// keywordService.js
//
// The lexical half of the hybrid job-match score. Semantic embeddings catch
// paraphrased meaning ("built REST APIs" ~ "API development") but miss exact
// terminology that ATS keyword scanners actually key off of ("Kubernetes"
// vs "container orchestration"). This module extracts a normalized set of
// skill-like tokens from the job description and measures literal overlap
// against the resume's extracted skills/technologies.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
  "are", "be", "as", "at", "by", "this", "that", "we", "you", "your", "our",
  "will", "have", "has", "from", "into", "role", "team", "work", "working",
  "years", "year", "experience", "strong", "ability", "skills", "including",
  "etc", "such", "who", "about", "job", "candidate", "responsibilities",
]);

// A small curated normalization map so common spelling/casing variants of
// the same skill collapse to one canonical token (e.g. "ReactJS" ~ "React").
const SYNONYMS = {
  reactjs: "react",
  "react.js": "react",
  nodejs: "node",
  "node.js": "node",
  expressjs: "express",
  "express.js": "express",
  js: "javascript",
  ts: "typescript",
  mongo: "mongodb",
  postgres: "postgresql",
  k8s: "kubernetes",
  py: "python",
  "ci/cd": "cicd",
  "ci-cd": "cicd",
};

function normalizeToken(raw) {
  const t = raw.toLowerCase().trim();
  return SYNONYMS[t] || t;
}

/**
 * extractKeywords(text)
 * Tokenizes text into normalized, deduped, stopword-free tokens (1-2 word
 * phrases), preserving things like "c++", "c#", "node.js" that a naive
 * \w+ regex would mangle.
 */
export function extractKeywords(text) {
  if (!text) return [];
  const matches = text.match(/[a-zA-Z][a-zA-Z0-9+.#/-]{1,30}/g) || [];
  const tokens = matches
    .map((t) => normalizeToken(t.replace(/^[-./]+|[-./]+$/g, "")))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return [...new Set(tokens)];
}

/**
 * keywordMatchScore(jdText, resumeSkillTokens)
 * Returns { score (0-100), matched: string[], missing: string[] } comparing
 * the job description's extracted keywords against the resume's known
 * skills/technologies (already extracted by the LLM extraction step).
 */
export function keywordMatchScore(jdText, resumeSkillTokens = []) {
  const jdKeywords = extractKeywords(jdText);
  const resumeSet = new Set(resumeSkillTokens.map((t) => normalizeToken(String(t))));

  if (jdKeywords.length === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  // Only score against tokens that plausibly look like skills/tech terms:
  // short technical tokens rather than every English word in the JD. We
  // approximate "skill-like" as tokens matched against the resume's own
  // vocabulary OR tokens containing a digit/symbol/camel pattern typical of
  // tech terms, to avoid treating generic words as required skills.
  const candidateSkills = jdKeywords.filter(
    (t) => resumeSet.has(t) || /[0-9+#.]/.test(t) || t.length <= 12
  );

  const matched = candidateSkills.filter((t) => resumeSet.has(t));
  const missing = candidateSkills.filter((t) => !resumeSet.has(t));

  const score = candidateSkills.length === 0 ? 0 : Math.round((matched.length / candidateSkills.length) * 100);

  return { score, matched, missing };
}
