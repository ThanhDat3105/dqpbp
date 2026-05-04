-- Migration: 004_create_daily_task_digests.sql

-- 1. Drop mock table
DROP TABLE IF EXISTS notifications;

-- 2. Create daily_task_digests
CREATE TABLE daily_task_digests (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  digest_date  DATE NOT NULL,
  tasks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- tasks schema per item:
  -- {
  --   task_id: integer,
  --   title: string,
  --   activity_id: integer,
  --   activity_name: string,
  --   location: string,
  --   due_date: string (YYYY-MM-DD),
  --   status: 'pending' | 'in_progress',
  --   is_read: boolean
  -- }
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_digest_date UNIQUE (user_id, digest_date)
);

CREATE INDEX idx_daily_digest_user_date
  ON daily_task_digests(user_id, digest_date);
