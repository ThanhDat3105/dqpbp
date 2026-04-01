-- ============================================================
-- Auth System: tokens table + performance indexes
-- Run this on your PostgreSQL database
-- ============================================================

-- Tokens table (access token blacklist + refresh token store)
CREATE TABLE IF NOT EXISTS tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('access', 'refresh')),
  blacklisted BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP
);

-- Index for fast blacklist lookup
CREATE INDEX IF NOT EXISTS idx_tokens_token       ON tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_user_type   ON tokens(user_id, type);

-- ============================================================
-- Calendar performance indexes (from Phase 1)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_due_date    ON activity_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_team        ON activity_tasks(team);
CREATE INDEX IF NOT EXISTS idx_tasks_activity_id ON activity_tasks(activity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees_gin ON activity_tasks USING GIN (assignees);

-- Users: fast email lookup for login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
