CREATE TABLE IF NOT EXISTS activity_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  work_type VARCHAR(100),
  department VARCHAR(255),
  location VARCHAR(255),
  document_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_template_tasks (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES activity_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  team TEXT[] NOT NULL DEFAULT '{}',
  assignees INTEGER[] NOT NULL DEFAULT '{}',
  notes TEXT,
  report_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_dqcd BOOLEAN DEFAULT false,
  start_offset_days INTEGER NOT NULL DEFAULT 0,
  due_offset_days INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_templates_status_created_at
  ON activity_templates(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_templates_work_department
  ON activity_templates(work_type, department);

CREATE INDEX IF NOT EXISTS idx_activity_template_tasks_template_order
  ON activity_template_tasks(template_id, display_order, id);
