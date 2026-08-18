-- Migration: 002_create_youth_personnel_table.sql
-- Module: Hồ sơ - Nhân sự Tuổi 17

CREATE TABLE IF NOT EXISTS youth_personnel (
  id                SERIAL        PRIMARY KEY,
  full_name         VARCHAR(100)  NOT NULL,
  date_of_birth     DATE          NOT NULL,                -- Business Rule #2: 15-19 tuổi
  permanent_address VARCHAR(255),
  temporary_address VARCHAR(255),
  phone             VARCHAR(15),                           -- Business Rule #3: 10 số, bắt đầu 0
  education_level   VARCHAR(50),                           -- THCS, THPT, Trung cấp, ...
  is_registered     BOOLEAN       NOT NULL DEFAULT FALSE,  -- Đã/chưa làm hồ sơ
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index để tăng tốc full-text search trên full_name
CREATE INDEX IF NOT EXISTS idx_youth_personnel_full_name
  ON youth_personnel (full_name);

-- Index để tăng tốc filter theo is_registered
CREATE INDEX IF NOT EXISTS idx_youth_personnel_is_registered
  ON youth_personnel (is_registered);


COMMENT ON TABLE youth_personnel IS 'Hồ sơ nhân sự tuổi 17 - không lưu CMND/CCCD theo Business Rule #5';
COMMENT ON COLUMN youth_personnel.is_registered IS 'TRUE = đã làm hồ sơ chính thức, FALSE = chưa';
