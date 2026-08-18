-- ─── Table: nguon (Danh sách Nguồn – 18+ tuổi) ──────────────────────────────
CREATE TABLE IF NOT EXISTS nguon (
  id                  SERIAL PRIMARY KEY,
  full_name           VARCHAR(100) NOT NULL,
  date_of_birth       DATE         NOT NULL,
  permanent_address   VARCHAR(255),
  temporary_address   VARCHAR(255),
  phone               VARCHAR(15),
  education_level     VARCHAR(50),
  -- Tham chiếu hồ sơ tuổi 17 gốc (nullable nếu nhập trực tiếp)
  youth_personnel_id  INTEGER REFERENCES youth_personnel(id) ON DELETE SET NULL,
  note                TEXT,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nguon_full_name          ON nguon(full_name);
CREATE INDEX IF NOT EXISTS idx_nguon_youth_personnel_id ON nguon(youth_personnel_id);


-- ─── Table: quan_nhan_du_bi (Quân nhân dự bị) ────────────────────────────────
CREATE TABLE IF NOT EXISTS quan_nhan_du_bi (
  id                  SERIAL PRIMARY KEY,
  full_name           VARCHAR(100) NOT NULL,
  date_of_birth       DATE         NOT NULL,
  permanent_address   VARCHAR(255),
  temporary_address   VARCHAR(255),
  phone               VARCHAR(15),
  education_level     VARCHAR(50),
  military_rank       VARCHAR(50),   -- Cấp bậc quân hàm
  unit                VARCHAR(100),  -- Đơn vị
  service_start_date  DATE,          -- Ngày nhập ngũ
  service_end_date    DATE,          -- Ngày xuất ngũ / mãn hạn
  reserve_class       VARCHAR(5),    -- Hạng dự bị: I | II
  note                TEXT,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qndb_full_name ON quan_nhan_du_bi(full_name);
