ALTER TABLE users
  ADD COLUMN
IF NOT EXISTS neighborhood TEXT;


ALTER TABLE youth_personnel
  ADD COLUMN
IF NOT EXISTS neighborhood TEXT;

ALTER TABLE quan_nhan_du_bi
  ADD COLUMN
IF NOT EXISTS neighborhood TEXT;

