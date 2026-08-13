// ---------------------------------------------------------------------------
// ragService.js
//
// A deliberately small, understandable RAG pipeline:
//   1. On first use, embed every chunk in knowledge/kb.json and cache the
//      vectors in memory (16 short documents - no vector DB needed).
//   2. Given a query (built from the job title + missing skills + resume
//      weak areas), embed it and return the top-K most similar KB chunks.
//   3. Those chunks are injected into the recommendation prompt as context,
//      so suggestions are grounded in actual ATS/resume guidance rather
//      than the model's unconstrained opinion.
// ---------------------------------------------------------------------------

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KB_PATH = path.join(__dirname, "..", "knowledge", "kb.json");

let indexPromise = null;

async function getIndex() {
  if (!indexPromise) {
    indexPromise = readFile(KB_PATH, "utf-8").then(JSON.parse);
  }

  return indexPromise;
}

/**
 * Fast lexical retrieval.
 *
 * The KB is intentionally small, so a lightweight
 * token-overlap scorer is faster and more predictable
 * than running the transformer model over every document.
 */
export async function retrieveContext(query, topK = 4) {
  const docs = await getIndex();

  const queryTokens = tokenize(query);

  const scored = docs.map((doc) => {
    const text = `${doc.topic} ${doc.text}`;
    const tokens = tokenize(text);

    const uniqueTokens = new Set(tokens);

    let score = 0;

    for (const token of queryTokens) {
      if (uniqueTokens.has(token)) {
        score += 1;
      }
    }

    return {
      id: doc.id,
      topic: doc.topic,
      text: doc.text,
      similarity: queryTokens.length > 0 ? score / queryTokens.length : 0,
    };
  });

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

function tokenize(text) {
  return [
    ...new Set(
      String(text || "")
        .toLowerCase()
        .match(/[a-z0-9+#.-]{3,}/g) || [],
    ),
  ];
}
