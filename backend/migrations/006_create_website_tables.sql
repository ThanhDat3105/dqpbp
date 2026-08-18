CREATE TABLE IF NOT EXISTS website_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE,
  content TEXT,
  category VARCHAR(100) NOT NULL,
  thumbnail_url VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  doc_number VARCHAR(100),
  issued_by VARCHAR(200),
  issued_date DATE,
  category VARCHAR(100) NOT NULL,
  file_url VARCHAR(500),
  file_size VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_slides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  image_url VARCHAR(500),
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_contacts (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(200),
  subject VARCHAR(100),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_website_articles_category_visible_order
  ON website_articles(category, is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_website_documents_category_status_visible
  ON website_documents(category, status, is_visible);
CREATE INDEX IF NOT EXISTS idx_website_slides_visible_order
  ON website_slides(is_visible, display_order);
