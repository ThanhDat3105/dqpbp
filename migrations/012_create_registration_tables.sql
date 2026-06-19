CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('tsqs', 'tuoi17', 'tinhnguyen', 'dqtt')),
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  dob DATE NOT NULL,
  workplace VARCHAR(300) NOT NULL,
  guardian_phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  client_ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registration_templates (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('tsqs', 'tuoi17', 'tinhnguyen', 'dqtt')),
  name VARCHAR(300) NOT NULL,
  code VARCHAR(100) NOT NULL,
  file_type VARCHAR(10) NOT NULL DEFAULT 'PDF',
  required BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  size VARCHAR(50),
  file_url VARCHAR(500) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_phone_created
  ON registrations(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrations_ip_created
  ON registrations(client_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_templates_category
  ON registration_templates(category, is_active, display_order);

INSERT INTO registration_templates (category, name, code, file_type, required, description, size, file_url, display_order) VALUES
  (
    'tsqs',
    'Phiếu đăng ký tuyển sinh quân sự',
    'Mẫu số 01/TSQS',
    'PDF',
    true,
    'Điền đầy đủ thông tin cá nhân, sức khỏe và nguyện vọng.',
    '245 KB',
    '/uploads/templates/tsqs-01.pdf',
    1
  ),
  (
    'tsqs',
    'Giấy cam kết sức khỏe',
    'Mẫu số 02/TSQS',
    'PDF',
    true,
    'Cam kết tình trạng sức khỏe theo quy định.',
    '180 KB',
    '/uploads/templates/tsqs-02.pdf',
    2
  ),
  (
    'tuoi17',
    'Phiếu đăng ký thanh niên 17 tuổi',
    'Mẫu số 01/T17',
    'PDF',
    true,
    'Điền thông tin cá nhân và người giám hộ.',
    '210 KB',
    '/uploads/templates/tuoi17-01.pdf',
    1
  ),
  (
    'tinhnguyen',
    'Phiếu đăng ký tình nguyện viên',
    'Mẫu số 01/TN',
    'PDF',
    true,
    'Điền thông tin cá nhân và lý do tham gia.',
    '195 KB',
    '/uploads/templates/tinhnguyen-01.pdf',
    1
  ),
  (
    'dqtt',
    'Phiếu đăng ký Dân quân tự vệ',
    'Mẫu số 01/DQTT',
    'PDF',
    true,
    'Điền đầy đủ thông tin cá nhân và nơi công tác.',
    '230 KB',
    '/uploads/templates/dqtt-01.pdf',
    1
  ),
  (
    'dqtt',
    'Giấy xác nhận nơi công tác',
    'Mẫu số 02/DQTT',
    'DOCX',
    false,
    'Xác nhận của cơ quan, đơn vị nơi công tác.',
    '95 KB',
    '/uploads/templates/dqtt-02.docx',
    2
  );
