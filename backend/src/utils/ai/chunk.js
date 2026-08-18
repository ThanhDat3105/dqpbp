"use strict";

const path = require("path");
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { OpenAIEmbeddings } = require("@langchain/openai");
const db = require("../../config/db");

const DEFAULT_TABLE =
  process.env.KNOWLEDGE_CHUNKS_TABLE ||
  process.env.ELASTICSEARCH_KNOWLEDGE_INDEX ||
  "knowledge_chunks";
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMS = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS) || 1536;
const MIN_CHARS = Number(process.env.CHUNK_MIN_CHARS) || 80;
const MAX_CHARS = Number(process.env.CHUNK_MAX_CHARS) || 2000;
const USE_SEMANTIC = process.env.CHUNK_USE_SEMANTIC !== "0";

let embeddingsClient;

function getEmbeddings() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for chunk embeddings");
  }
  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddings({
      model: EMBEDDING_MODEL,
      apiKey: process.env.OPENAI_API_KEY,
      dimensions: EMBEDDING_DIMS,
    });
  }
  return embeddingsClient;
}

function cosineDistance(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function semanticSplit(text, embeddings) {
  const sentences = text
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length <= 1) return [text.trim()];

  const vectors = await embeddings.embedDocuments(sentences);
  const distances = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    distances.push(cosineDistance(vectors[i], vectors[i + 1]));
  }

  const sorted = [...distances].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.9)] ?? 0.5;

  const parts = [];
  let buf = sentences[0];
  for (let i = 1; i < sentences.length; i++) {
    if (distances[i - 1] > threshold) {
      parts.push(buf.trim());
      buf = sentences[i];
    } else {
      buf += ` ${sentences[i]}`;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length ? parts : [text.trim()];
}

function splitByDieu(text, source) {
  const parts = text.split(/(?=Điều\s+\d+\.)/u);
  return parts
    .map((part) => part.trim())
    .filter((p) => p.length >= MIN_CHARS)
    .map((part, i) => {
      const m = part.match(/^Điều\s+(\d+)\.\s*([^\n]{0,120})?/u);
      const title = m
        ? `Điều ${m[1]}${m[2] ? `. ${m[2].trim()}` : ""}`
        : `Điều ${i}`;
      return new Document({
        pageContent: part,
        metadata: { source, title, type: "dieu" },
      });
    });
}

function buildChunkId(source, title, index) {
  const slug = (title || `chunk-${index}`)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F#._-]/g, "");
  const base = path.basename(source || "document");
  return `${base}#${slug || index}`;
}

function documentsToChunks(documents, source) {
  const basename = path.basename(source || "document");
  return documents
    .map((doc, i) => ({
      id: buildChunkId(source, doc.metadata?.title, i),
      source: source || basename,
      path: doc.metadata?.path || basename,
      type: doc.metadata?.type || "text",
      title: doc.metadata?.title || null,
      text: doc.pageContent.trim(),
      metadata: doc.metadata || {},
    }))
    .filter((c) => c.text.length >= MIN_CHARS);
}

/**
 * Split text into RAG-ready chunks (OpenAI semantic or character fallback).
 * @param {string} text
 * @param {{ source?: string, splitByDieu?: boolean, useSemantic?: boolean }} [options]
 */
async function chunkText(text, options = {}) {
  const source = options.source || "document";
  const useSemantic =
    options.useSemantic !== undefined ? options.useSemantic : USE_SEMANTIC;

  let articles;
  if (options.splitByDieu && /Điều\s+\d+\./u.test(text)) {
    articles = splitByDieu(text, source);
    console.log(articles, "articles");
  } else {
    articles = [
      new Document({
        pageContent: text,
        metadata: { source, type: "text" },
      }),
    ];
  }

  if (articles.length < 2 && !options.splitByDieu) {
    articles = [
      new Document({
        pageContent: text,
        metadata: { source, type: "text" },
      }),
    ];
  }

  const fallback = new RecursiveCharacterTextSplitter({
    chunkSize: 900,
    chunkOverlap: 150,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const finalDocs = [];
  const embeddings = useSemantic ? getEmbeddings() : null;

  for (const doc of articles) {
    if (doc.pageContent.length <= MAX_CHARS) {
      finalDocs.push(doc);
      continue;
    }

    if (useSemantic && embeddings) {
      const pieces = await semanticSplit(doc.pageContent, embeddings);
      for (const piece of pieces) {
        if (piece.length >= MIN_CHARS) {
          finalDocs.push(
            new Document({
              pageContent: piece,
              metadata: { ...doc.metadata },
            }),
          );
        }
      }
    } else {
      console.log(doc, "fallback doc");
      const split = await fallback.splitDocuments([doc]);
      finalDocs.push(...split);
    }
  }

  return documentsToChunks(finalDocs, source);
}

/**
 * Add OpenAI embedding vectors to chunk objects.
 * @param {Array<{ text: string }>} chunks
 */
async function embedChunks(chunks) {
  const embeddings = getEmbeddings();
  const texts = chunks.map((c) => c.text);
  const vectors = await embeddings.embedDocuments(texts);
  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: vectors[i],
  }));
}

function assertSafeTableName(tableName) {
  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}

function toVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

/**
 * Verify the pgvector-backed knowledge table exists.
 * @param {string} [tableName]
 */
async function ensureKnowledgeTable(tableName = DEFAULT_TABLE) {
  const table = assertSafeTableName(tableName);
  const { rows } = await db.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [table],
  );

  if (!rows[0]?.exists) {
    throw new Error(
      `Knowledge table "${table}" does not exist. Run migrations/009_create_knowledge_chunks.sql first.`,
    );
  }

  return { table };
}

/**
 * Insert or update chunks (with embeddings) in PostgreSQL.
 * @param {Array} chunks
 * @param {{ table?: string, index?: string }} [options]
 */
async function storeChunksInPostgres(chunks, options = {}) {
  const tableName = assertSafeTableName(
    options.table || options.index || DEFAULT_TABLE,
  );
  if (!chunks.length) {
    return { indexed: 0, table: tableName, index: tableName, errors: false };
  }

  await ensureKnowledgeTable(tableName);

  const client = await db.connect();
  const indexedAt = new Date().toISOString();

  try {
    await client.query("BEGIN");

    for (const chunk of chunks) {
      await client.query(
        `INSERT INTO ${tableName}
           (id, source, path, type, title, text, metadata, embedding, indexed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector, $9)
         ON CONFLICT (id) DO UPDATE SET
           source = EXCLUDED.source,
           path = EXCLUDED.path,
           type = EXCLUDED.type,
           title = EXCLUDED.title,
           text = EXCLUDED.text,
           metadata = EXCLUDED.metadata,
           embedding = EXCLUDED.embedding,
           indexed_at = EXCLUDED.indexed_at`,
        [
          chunk.id,
          chunk.source,
          chunk.path,
          chunk.type,
          chunk.title,
          chunk.text,
          JSON.stringify(chunk.metadata || {}),
          toVectorLiteral(chunk.embedding),
          indexedAt,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`PostgreSQL chunk store failed: ${err.message}`);
  } finally {
    client.release();
  }

  return {
    indexed: chunks.length,
    table: tableName,
    index: tableName,
    errors: false,
  };
}

/**
 * Remove all chunks for a given source (use before re-indexing).
 * @param {string} source
 * @param {string} [tableName]
 */
async function deleteChunksBySource(source, tableName = DEFAULT_TABLE) {
  const table = assertSafeTableName(tableName);
  await ensureKnowledgeTable(table);

  const { rowCount } = await db.query(
    `DELETE FROM ${table} WHERE source = $1`,
    [source],
  );

  return { deleted: rowCount ?? 0 };
}

/**
 * Chunk text, embed with OpenAI, and store vectors in PostgreSQL.
 * @param {string} text
 * @param {{
 *   source?: string,
 *   index?: string,
 *   splitByDieu?: boolean,
 *   useSemantic?: boolean,
 *   replaceSource?: boolean,
 * }} [options]
 */
async function chunkAndStore(text, options = {}) {
  const source = options.source || "document";
  const tableName = options.table || options.index || DEFAULT_TABLE;

  if (options.replaceSource !== false) {
    await deleteChunksBySource(source, tableName);
  }

  const chunks = await chunkText(text, options);
  const embedded = await embedChunks(chunks);
  const storeResult = await storeChunksInPostgres(embedded, {
    table: tableName,
  });

  return {
    source,
    chunkCount: chunks.length,
    ...storeResult,
    chunkIds: chunks.map((c) => c.id),
  };
}

/**
 * Chunk a file from disk and store in PostgreSQL.
 * @param {string} filePath - absolute or relative path
 * @param {{ splitByDieu?: boolean, index?: string, replaceSource?: boolean }} [options]
 */
async function chunkAndStoreFile(filePath, options = {}) {
  const fs = require("fs/promises");
  const absolutePath = path.resolve(filePath);
  const text = await fs.readFile(absolutePath, "utf8");
  const splitByDieu =
    options.splitByDieu !== undefined
      ? options.splitByDieu
      : /Điều\s+\d+\./u.test(text);

  return chunkAndStore(text, {
    ...options,
    source: options.source || absolutePath,
    splitByDieu,
  });
}

/**
 * Vector similarity search over stored chunks (pgvector cosine distance).
 * @param {string} query
 * @param {{ topK?: number, table?: string, index?: string, source?: string }} [options]
 */
async function searchSimilarChunks(query, options = {}) {
  const tableName = assertSafeTableName(
    options.table || options.index || DEFAULT_TABLE,
  );
  const topK =
    options.topK || Number(process.env.KNOWLEDGE_RETRIEVAL_TOP_K) || 6;

  await ensureKnowledgeTable(tableName);

  const embeddings = getEmbeddings();
  const [queryVector] = await embeddings.embedDocuments([query]);
  const vectorLiteral = toVectorLiteral(queryVector);

  const params = [vectorLiteral, topK];
  let sourceFilter = "";
  if (options.source) {
    params.push(options.source);
    sourceFilter = `WHERE source = $3`;
  }

  const { rows } = await db.query(
    `SELECT
       id,
       text,
       title,
       source,
       path,
       type,
       metadata,
       1 - (embedding <=> $1::vector) AS score
     FROM ${tableName}
     ${sourceFilter}
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    score: Number(row.score),
    text: row.text,
    title: row.title,
    source: row.source,
    path: row.path,
    type: row.type,
    metadata: row.metadata,
  }));
}

module.exports = {
  chunkText,
  embedChunks,
  ensureKnowledgeTable,
  storeChunksInPostgres,
  deleteChunksBySource,
  chunkAndStore,
  chunkAndStoreFile,
  searchSimilarChunks,
  DEFAULT_TABLE,
  EMBEDDING_DIMS,
};
