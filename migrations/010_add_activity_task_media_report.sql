ALTER TABLE activity_tasks
  ADD COLUMN
IF NOT EXISTS require_media_report BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN
IF NOT EXISTS media_files JSONB NOT NULL DEFAULT '[]'::jsonb;
