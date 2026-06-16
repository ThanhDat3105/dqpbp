ALTER TABLE activity_template_tasks
  ADD COLUMN IF NOT EXISTS require_media_report BOOLEAN NOT NULL DEFAULT false,
  DROP COLUMN IF EXISTS start_offset_days,
  DROP COLUMN IF EXISTS due_offset_days;
