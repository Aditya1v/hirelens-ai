// ---------------------------------------------------------------------------
// companyService.js
//
// Powers the company-name autocomplete on the upload form. Uses Clearbit's
// free Autocomplete endpoint (no API key/signup required, ~600 req/min).
// Cached briefly in memory since the same prefixes ("goo", "goog",
// "google") get queried repeatedly as a user types.
// ---------------------------------------------------------------------------

import { createCache } from "../utils/simpleCache.js";

const cache = createCache({ ttlMs: 10 * 60 * 1000, maxEntries: 300 });

/**
 * suggestCompanies(query)
 * Returns up to 8 { name, domain } suggestions for a partial company name.
 * Returns [] on any upstream failure - this is a UX nicety, never a
 * blocker, so failures are swallowed rather than surfaced as errors.
 */
export async function suggestCompanies(query) {
  const q = (query || "").trim();
  if (q.length < 2) return [];

  const cached = cache.get(q.toLowerCase());
  if (cached) return cached;

  const base = process.env.COMPANY_AUTOCOMPLETE_URL || "https://autocomplete.clearbit.com/v1/companies/suggest";

  try {
    const res = await fetch(`${base}?query=${encodeURIComponent(q)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data)
      ? data.slice(0, 8).map((c) => ({ name: c.name, domain: c.domain || null }))
      : [];

    cache.set(q.toLowerCase(), results);
    return results;
  } catch (err) {
    console.error("[companyService] suggestion lookup failed:", err.message);
    return [];
  }
}
