CREATE TABLE IF NOT EXISTS website_quick_links (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  url VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_quick_links_visible_order
  ON website_quick_links(is_visible, display_order);
