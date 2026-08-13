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
import { embedText, cosineSimilarity } from "./embeddingService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_PATH = path.join(__dirname, "..", "knowledge", "kb.json");

let indexPromise = null;

async function buildIndex() {
  const raw = await readFile(KB_PATH, "utf-8");
  const docs = JSON.parse(raw);
  const withEmbeddings = await Promise.all(
    docs.map(async (doc) => ({ ...doc, embedding: await embedText(`${doc.topic}: ${doc.text}`) }))
  );
  return withEmbeddings;
}

function getIndex() {
  if (!indexPromise) indexPromise = buildIndex();
  return indexPromise;
}

/**
 * retrieveContext(query, topK = 4)
 * Returns the topK knowledge-base chunks most semantically similar to the
 * query, each annotated with its similarity score for transparency/logging.
 */
export async function retrieveContext(query, topK = 4) {
  const index = await getIndex();
  const queryVec = await embedText(query);

  const scored = index.map((doc) => ({
    id: doc.id,
    topic: doc.topic,
    text: doc.text,
    similarity: cosineSimilarity(queryVec, doc.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
