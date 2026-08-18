-- Migration: add unique constraint for task_assignees(task_id, user_id)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_assignees_task_user_unique'
  ) THEN
    ALTER TABLE task_assignees
    ADD CONSTRAINT task_assignees_task_user_unique UNIQUE (task_id, user_id);
  END IF;
END $$;
