// ---------------------------------------------------------------------------
// embeddingService.js
//
// Produces sentence embeddings locally (no external API call) using
// transformers.js running the all-MiniLM-L6-v2 model in-process. This is
// what "semantic" matching means in HireLens: resume text and job
// descriptions are both embedded into 384-dim vectors, and cosine
// similarity between them is the semantic component of the job-match score.
// It's also reused to retrieve relevant knowledge-base chunks for RAG.
//
// The model (~90MB) is downloaded once from the Hugging Face hub on first
// use and cached under the transformers.js cache dir - this requires
// outbound internet access the first time the server starts.
// ---------------------------------------------------------------------------

import { pipeline } from "@xenova/transformers";

let extractorPromise = null;

// Lazily load and memoize the feature-extraction pipeline so the (slow)
// model load only happens once per server process.
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractorPromise;
}

/**
 * embedText(text)
 * Returns a mean-pooled, L2-normalized embedding vector (number[]) for the
 * given text. Falls back to a deterministic bag-of-words hashing vector if
 * the transformer model can't be loaded (e.g. no internet on first boot),
 * so the app degrades gracefully instead of hard-failing every analysis.
 */
export async function embedText(text) {
  const clean = (text || "").slice(0, 8000); // guard against pathologically long inputs
  try {
    const extractor = await getExtractor();
    const output = await extractor(clean, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error("[embeddingService] transformer embedding failed, using fallback vector:", err.message);
    return hashingFallbackVector(clean);
  }
}

/**
 * cosineSimilarity(a, b)
 * Standard cosine similarity between two equal-length vectors, returned as
 * a value in [0, 1] (vectors here are non-negative-normalized text
 * embeddings in practice, so this stays in range).
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, sim));
}

// Deterministic 256-dim hashing-trick bag-of-words vector. Not a real
// semantic embedding, but keeps the app functional offline and is still
// a legitimate (if weak) lexical-overlap signal.
const FALLBACK_DIM = 256;
function hashingFallbackVector(text) {
  const vec = new Array(FALLBACK_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9+.#]+/g) || [];
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % FALLBACK_DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}
