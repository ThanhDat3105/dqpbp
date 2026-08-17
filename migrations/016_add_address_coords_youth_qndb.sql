-- Optional lat/lng for permanent & temporary addresses (tuổi 17 + QNDB)

ALTER TABLE youth_personnel
  ADD COLUMN IF NOT EXISTS permanent_address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS permanent_address_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temporary_address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temporary_address_lng DOUBLE PRECISION;

ALTER TABLE quan_nhan_du_bi
  ADD COLUMN IF NOT EXISTS permanent_address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS permanent_address_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temporary_address_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temporary_address_lng DOUBLE PRECISION;

COMMENT ON COLUMN youth_personnel.permanent_address_lat IS 'Vĩ độ địa chỉ thường trú (optional)';
COMMENT ON COLUMN youth_personnel.permanent_address_lng IS 'Kinh độ địa chỉ thường trú (optional)';
COMMENT ON COLUMN youth_personnel.temporary_address_lat IS 'Vĩ độ địa chỉ tạm trú (optional)';
COMMENT ON COLUMN youth_personnel.temporary_address_lng IS 'Kinh độ địa chỉ tạm trú (optional)';

COMMENT ON COLUMN quan_nhan_du_bi.permanent_address_lat IS 'Vĩ độ địa chỉ thường trú (optional)';
COMMENT ON COLUMN quan_nhan_du_bi.permanent_address_lng IS 'Kinh độ địa chỉ thường trú (optional)';
COMMENT ON COLUMN quan_nhan_du_bi.temporary_address_lat IS 'Vĩ độ địa chỉ tạm trú (optional)';
COMMENT ON COLUMN quan_nhan_du_bi.temporary_address_lng IS 'Kinh độ địa chỉ tạm trú (optional)';
