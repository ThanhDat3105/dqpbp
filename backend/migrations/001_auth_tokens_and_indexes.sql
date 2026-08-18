-- ============================================================
-- Auth System: tokens table + performance indexes
-- Run this on your PostgreSQL database
-- ============================================================

-- Tokens table (access token blacklist + refresh token store)
CREATE TABLE
IF NOT EXISTS tokens
(
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users
(id) ON
DELETE CASCADE,
  token       TEXT
NOT NULL UNIQUE,
  type        VARCHAR
(20) NOT NULL CHECK
(type IN
('access', 'refresh')),
  blacklisted BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW
(),
  updated_at  TIMESTAMP
);

-- public.activity_tasks definition

-- Drop table

-- DROP TABLE public.activity_tasks;

CREATE TABLE activity_tasks
(
  id serial4 NOT NULL,
  activity_id int4 NULL,
  title varchar(255) NULL,
  team _text NULL,
  due_date timestamp NULL,
  report_fields jsonb NULL,
  notes text NULL,
  completed_at timestamp NULL,
  status varchar(50) NULL,
  accepted_at timestamp NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
  requires_dqcd bool DEFAULT false NULL,
  start_date timestamp NULL,
  end_date timestamp NULL,
  reminded_6h bool DEFAULT false NULL,
  reminded_1h bool DEFAULT false NULL,
  require_media_report bool DEFAULT false NOT NULL,
  media_files jsonb DEFAULT '[]'
  ::jsonb NOT NULL,
	CONSTRAINT activity_tasks_pkey PRIMARY KEY
  (id)
);

  ALTER TABLE activity_tasks ADD CONSTRAINT activity_tasks_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES activities(id);

  -- Index for fast blacklist lookup
  CREATE INDEX
  IF NOT EXISTS idx_tokens_token       ON tokens
  (token);
  CREATE INDEX
  IF NOT EXISTS idx_tokens_user_type   ON tokens
  (user_id, type);

  -- ============================================================
  -- Calendar performance indexes (from Phase 1)
  -- ============================================================
  CREATE INDEX
  IF NOT EXISTS idx_tasks_due_date    ON activity_tasks
  (due_date);
  CREATE INDEX
  IF NOT EXISTS idx_tasks_team        ON activity_tasks
  (team);
  CREATE INDEX
  IF NOT EXISTS idx_tasks_activity_id ON activity_tasks
  (activity_id);
  CREATE INDEX
  IF NOT EXISTS idx_tasks_assignees_gin ON activity_tasks USING GIN
  (assignees);

  -- Users: fast email lookup for login
  CREATE INDEX
  IF NOT EXISTS idx_users_email ON users
  (email);
