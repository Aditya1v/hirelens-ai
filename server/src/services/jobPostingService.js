// ---------------------------------------------------------------------------
// jobPostingService.js
//
// Powers "auto-find a matching job posting" on the upload form: given a
// company name + job title, searches Adzuna's job index (free tier, ~1,000
// calls/month) and returns the closest match's description as a starting
// point the user can review and edit before analysis.
//
// Honesty note: Adzuna is a job-board aggregator, not a scraper of each
// company's own careers page, and its free tier returns a description
// EXCERPT (not always the full posting) plus a link to the original
// listing. That's clearly surfaced to the frontend (excerpt + sourceUrl)
// so the user knows to review/expand it - this is what "automatically
// find the relevant job posting... user must still be able to manually
// edit" means in practice without standing up a scraping pipeline.
//
// Aggressively cached (long TTL) since the free tier is only ~33 calls/day.
// ---------------------------------------------------------------------------

import { createCache } from "../utils/simpleCache.js";

const cache = createCache({ ttlMs: 60 * 60 * 1000, maxEntries: 200 }); // 1 hour

export function isJobPostingLookupConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

/**
 * findJobPosting({ companyName, jobTitle })
 * Returns { title, company, description, sourceUrl, isExcerpt: true } for
 * the best match, or null if not configured / nothing matched (callers
 * should fall back to manual entry in either case - this is never fatal).
 */
export async function findJobPosting({ companyName, jobTitle }) {
  if (!isJobPostingLookupConfigured()) return null;
  if (!companyName?.trim() || !jobTitle?.trim()) return null;

  const cacheKey = `${companyName.toLowerCase()}::${jobTitle.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const country = process.env.ADZUNA_COUNTRY || "us";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  url.searchParams.set("app_id", process.env.ADZUNA_APP_ID);
  url.searchParams.set("app_key", process.env.ADZUNA_APP_KEY);
  url.searchParams.set("what_phrase", jobTitle.trim());
  url.searchParams.set("results_per_page", "25");
  url.searchParams.set("content-type", "application/json");

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      cache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    const match = pickBestMatch(results, companyName);
    if (!match) {
      cache.set(cacheKey, null);
      return null;
    }

    const posting = {
      title: match.title,
      company: match.company?.display_name || companyName,
      description: (match.description || "").trim(),
      sourceUrl: match.redirect_url || null,
      isExcerpt: true,
    };

    cache.set(cacheKey, posting);
    return posting;
  } catch (err) {
    console.error("[jobPostingService] lookup failed:", err.message);
    return null;
  }
}

// Finds the listing whose company name most closely matches the one the
// user typed (case-insensitive substring match either direction), since
// Adzuna's search API doesn't support an exact company filter on the free
// tier - falls back to the first result if no company match is found, on
// the theory that a relevant-title, wrong-company result is still a
// better manual-edit starting point than nothing.
function pickBestMatch(results, companyName) {
  if (results.length === 0) return null;
  const target = companyName.toLowerCase();

  const exactish = results.find((r) => {
    const name = (r.company?.display_name || "").toLowerCase();
    return name && (name.includes(target) || target.includes(name));
  });

  return exactish || results[0];
}
