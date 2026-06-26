"use strict";

const { searchSimilarChunks } = require("./chunk");

const DEFAULT_TOP_K = Number(process.env.KNOWLEDGE_RETRIEVAL_TOP_K) || 6;
const DEFAULT_MAX_CHARS =
  Number(process.env.KNOWLEDGE_RETRIEVAL_MAX_CHARS) || 12_000;

function formatChunkBlock(hit) {
  const header = hit.title
    ? `--- ${hit.title} (${hit.source || hit.path || "unknown"}) ---`
    : `--- ${hit.source || hit.path || hit.id} ---`;
  return `${header}\n${hit.text.trim()}`;
}

/**
 * Vector search: return matching chunks from PostgreSQL (pgvector).
 * @param {string} question
 * @param {{ topK?: number, index?: string, source?: string }} [options]
 */
async function getRelevantChunks(question, options = {}) {
  const q = question?.trim();
  if (!q) return [];

  return searchSimilarChunks(q, {
    topK: options.topK ?? DEFAULT_TOP_K,
    index: options.index,
    source: options.source,
  });
}

/**
 * Build RAG context text from a user question.
 * @param {string} question
 * @param {{ topK?: number, maxChars?: number, index?: string, source?: string }} [options]
 * @returns {Promise<{
 *   content: string,
 *   sources: string[],
 *   chunkIds: string[],
 *   chunks: Array,
 * }>}
 */
async function getRelevantText(question, options = {}) {
  const q = question?.trim();
  if (!q) {
    return { content: "", sources: [], chunkIds: [], chunks: [], topScore: 0 };
  }

  const topK = options.topK ?? DEFAULT_TOP_K;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  const hits = await getRelevantChunks(q, {
    topK,
    index: options.index,
    source: options.source,
  });

  if (!hits.length) {
    return { content: "", sources: [], chunkIds: [], chunks: [], topScore: 0 };
  }

  const selected = [];
  let totalChars = 0;

  for (const hit of hits) {
    const block = formatChunkBlock(hit);
    if (selected.length && totalChars + block.length + 2 > maxChars) break;
    selected.push(hit);
    totalChars += block.length + (selected.length > 1 ? 2 : 0);
  }

  const content = selected.map(formatChunkBlock).join("\n\n");
  const sources = [
    ...new Set(selected.map((h) => h.source || h.path).filter(Boolean)),
  ];
  const chunkIds = selected.map((h) => h.id);
  const topScore = selected[0]?.score ?? 0;

  return {
    content,
    sources,
    chunkIds,
    chunks: selected,
    topScore,
  };
}

module.exports = {
  getRelevantChunks,
  getRelevantText,
};
