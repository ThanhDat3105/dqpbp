-- Add dqcd_unit column for mobilized DQCD unit on task completion
ALTER TABLE activity_tasks
  ADD COLUMN IF NOT EXISTS dqcd_unit TEXT NULL;
