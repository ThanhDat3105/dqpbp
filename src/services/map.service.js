"use strict";

const db = require("../config/db");
const { ForbiddenError } = require("../core/error.response");

const FULL_ACCESS_ROLES = new Set(["ADMIN", "CHI_HUY", "TO_TRUONG"]);
const ALLOWED_ROLES = new Set([...FULL_ACCESS_ROLES, "DQTT"]);

const PERSONNEL_TYPES = ["dqcd", "quan_nhan_du_bi", "tuoi_17"];

const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const toYear = (value) => {
  if (!value) return null;
  const year =
    value instanceof Date
      ? value.getFullYear()
      : Number(String(value).slice(0, 4));
  return Number.isFinite(year) ? year : null;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatPerson = (row) => ({
  id: String(row.id),
  ho_ten: row.ho_ten,
  loai: row.loai,
  khu_pho: row.khu_pho ?? null,
  dia_chi: row.dia_chi ?? null,
  nam_vao_dq: toYear(row.nam_vao_dq),
  ngay_sinh: toIsoDate(row.ngay_sinh),
  lat: toNumberOrNull(row.lat),
  lng: toNumberOrNull(row.lng),
});

const resolveDqttKhuPhoFilter = async (userId) => {
  const { rows } = await db.query(
    `SELECT unit_code, managed_units FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  const user = rows[0];
  if (!user) return null;

  return user.managed_units;
};

const buildKhuPhoClause = (column, filter, params) => {
  if (!filter) return "";

  if (Array.isArray(filter)) {
    params.push(filter);
    return `AND ${column} = ANY($${params.length})`;
  }

  params.push(filter);
  return `AND ${column} = $${params.length}`;
};

const fetchDqcd = async (khuPhoFilter) => {
  const params = [];
  const khuPhoClause = buildKhuPhoClause("unit_code", khuPhoFilter, params);

  const { rows } = await db.query(
    `SELECT
       id,
       name AS ho_ten,
       'dqcd' AS loai,
       unit_code AS khu_pho,
       address AS dia_chi,
       enlistment_date AS nam_vao_dq,
       NULL::date AS ngay_sinh
     FROM users
     WHERE role = 'DQCD'
       AND is_active = true
       ${khuPhoClause}
     ORDER BY name ASC`,
    params,
  );

  return rows;
};

const fetchTuoi17 = async (khuPhoFilter) => {
  const params = [];
  const khuPhoClause = buildKhuPhoClause("neighborhood", khuPhoFilter, params);

  const { rows } = await db.query(
    `SELECT
       id,
       full_name AS ho_ten,
       'tuoi_17' AS loai,
       neighborhood AS khu_pho,
       COALESCE(permanent_address, temporary_address) AS dia_chi,
       NULL::date AS nam_vao_dq,
       date_of_birth AS ngay_sinh
     FROM youth_personnel
     WHERE TRUE
       ${khuPhoClause}
     ORDER BY full_name ASC`,
    params,
  );

  return rows;
};

const fetchQndb = async (khuPhoFilter) => {
  const params = [];
  const khuPhoClause = buildKhuPhoClause("khu_pho", khuPhoFilter, params);

  const { rows } = await db.query(
    `SELECT
       id,
       full_name AS ho_ten,
       'quan_nhan_du_bi' AS loai,
       unit AS khu_pho,
       COALESCE(permanent_address, temporary_address) AS dia_chi,
       service_start_date AS nam_vao_dq,
       NULL::date AS ngay_sinh
     FROM quan_nhan_du_bi
     WHERE TRUE
       ${khuPhoClause}
     ORDER BY full_name ASC`,
    params,
  );

  return rows;
};

const fetchMapPersonnel = async (requester, filters = {}) => {
  const { role, user_id } = requester;

  if (!ALLOWED_ROLES.has(role)) {
    throw new ForbiddenError("Không có quyền truy cập module bản đồ");
  }

  let allowedTypes = [...PERSONNEL_TYPES];
  let khuPhoFilter = filters.khu_pho ?? null;

  if (role === "DQTT") {
    khuPhoFilter = await resolveDqttKhuPhoFilter(user_id);
    if (!khuPhoFilter) {
      throw new ForbiddenError("DQTT không có khu phố phụ trách");
    }
    allowedTypes = ["dqcd", "tuoi_17"];
  }

  let typesToFetch = allowedTypes;
  if (filters.loai) {
    if (!allowedTypes.includes(filters.loai)) {
      return [];
    }
    typesToFetch = [filters.loai];
  }

  const fetchers = {
    dqcd: fetchDqcd,
    tuoi_17: fetchTuoi17,
    quan_nhan_du_bi: fetchQndb,
  };

  const rows = [];
  for (const type of typesToFetch) {
    const typeRows = await fetchers[type](khuPhoFilter);
    rows.push(...typeRows);
  }

  return rows.map(formatPerson);
};

module.exports = {
  fetchMapPersonnel,
};
