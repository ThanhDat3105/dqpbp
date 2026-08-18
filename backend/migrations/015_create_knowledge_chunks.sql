-- Knowledge base chunks with pgvector embeddings for RAG search
CREATE EXTENSION
IF NOT EXISTS vector;

CREATE TABLE
IF NOT EXISTS knowledge_chunks
(
  id          TEXT PRIMARY KEY,
  source      TEXT NOT NULL,
  path        TEXT,
  type        TEXT,
  title       TEXT,
  text        TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding   vector
(1536) NOT NULL,
  indexed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW
()
);

CREATE INDEX
IF NOT EXISTS idx_knowledge_chunks_source
  ON knowledge_chunks
(source);

CREATE INDEX 
IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks
  USING hnsw
(embedding vector_cosine_ops);
