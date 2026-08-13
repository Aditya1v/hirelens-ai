import rateLimit from "express-rate-limit";

// Tighter limit on auth endpoints to slow down credential-stuffing/brute force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again later." },
});

// AI calls are the most expensive resource in this app (LLM + embedding
// compute) - a looser but still real limit protects against runaway cost.
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many AI requests. Please slow down and try again shortly." },
});

// Job-posting/company lookups hit third-party free tiers with tight quotas
// (Adzuna: ~1,000 calls/month) - a stricter per-user limit protects that
// budget from being burned by a single user's rapid typing/retries.
export const jobLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many lookups. Please slow down." },
});
