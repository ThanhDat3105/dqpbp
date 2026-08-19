"use strict";

const db = require("../config/db");
const axios = require("axios");
const { ForbiddenError } = require("../core/error.response");

const FULL_ACCESS_ROLES = new Set(["ADMIN", "CHI_HUY", "TO_TRUONG"]);
const ALLOWED_ROLES = new Set([...FULL_ACCESS_ROLES, "DQTT"]);

const PERSONNEL_TYPES = ["dqcd", "quan_nhan_du_bi", "tuoi_17"];

const GEOCODE_DELAY = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const formatPerson = (row) => ({
  id: String(row.id),
  name: row.name ?? null,
  full_name: row.full_name ?? null,
  type: row.type,
  neighborhood: row.neighborhood ?? null,
  unit_code: row.unit_code ?? null,
  address: row.address ?? null,
  permanent_address: row.permanent_address ?? null,
  temporary_address: row.temporary_address ?? null,
  permanent_address_lat: toNumberOrNull(row.permanent_address_lat),
  permanent_address_lng: toNumberOrNull(row.permanent_address_lng),
  temporary_address_lat: toNumberOrNull(row.temporary_address_lat),
  temporary_address_lng: toNumberOrNull(row.temporary_address_lng),
  enlistment_date: toIsoDate(row.enlistment_date),
  service_start_date: toIsoDate(row.service_start_date),
  date_of_birth: toIsoDate(row.date_of_birth),
  lat: toNumberOrNull(row.lat),
  lng: toNumberOrNull(row.lng),
});

const geocodeAddress = async (address) => {
  if (!address) {
    return {
      lat: null,
      lng: null,
    };
  }

  try {
    const response = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: `${address}, Vietnam`,
          format: "json",
          limit: 1,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
        timeout: 10000,
      },
    );

    const result = response.data?.results?.[0];

    if (!result) {
      console.log(`[GEOCODE] Address not found: ${address}`);

      return {
        lat: null,
        lng: null,
      };
    }

    return {
      lat: Number(result.lat),
      lng: Number(result.lon),
    };
  } catch (error) {
    console.error(
      `[GEOCODE] Failed: ${address}`,
      error.response?.data || error.message,
    );

    return {
      lat: null,
      lng: null,
    };
  }
};

const geocodeMissingDqcd = async (rows) => {
  for (const person of rows) {
    // Đã có tọa độ
    if (person.lat != null && person.lng != null) {
      continue;
    }

    // Không có địa chỉ
    if (!person.address) {
      continue;
    }

    try {
      const coordinates = await geocodeAddress(person.address);

      if (coordinates.lat == null || coordinates.lng == null) {
        continue;
      }

      await db.query(
        `UPDATE users
         SET lat = $1,
             lng = $2
         WHERE id = $3`,
        [coordinates.lat, coordinates.lng, person.id],
      );

      console.log(`[GEOCODE] Updated DQCD ${person.id}:`, coordinates);
    } catch (error) {
      console.error(`[GEOCODE] Failed DQCD ${person.id}:`, error.message);
    }

    // tránh 429
    await sleep(GEOCODE_DELAY);
  }
};

const attachCoordinates = async (rows) => {
  return Promise.all(
    rows.map(async (person) => {
      const { lat, lng } = await geocodeAddress(person.permanent_address);

      return {
        ...person,
        lat,
        lng,
      };
    }),
  );
};

const resolveDqttNeighborhoodFilter = async (userId) => {
  const { rows } = await db.query(
    `SELECT unit_code, managed_units FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  const user = rows[0];
  if (!user) return null;

  return user.managed_units;
};

const buildNeighborhoodClause = (column, filter, params) => {
  if (!filter) return "";

  if (Array.isArray(filter)) {
    params.push(filter);
    return `AND ${column} = ANY($${params.length})`;
  }

  params.push(filter);
  return `AND ${column} = $${params.length}`;
};

const fetchDqcd = async (neighborhoodFilter) => {
  const params = [];

  const neighborhoodClause = buildNeighborhoodClause(
    "COALESCE(neighborhood, unit_code)",
    neighborhoodFilter,
    params,
  );

  const { rows } = await db.query(
    `SELECT
       id,
       name,
       'dqcd' AS type,
       neighborhood,
       unit_code,
       address,
       enlistment_date,
       date_of_birth,
       lat,
       lng
     FROM users
     WHERE role = 'DQCD'
       AND is_active = true
       ${neighborhoodClause}
     ORDER BY name ASC`,
    params,
  );

  // Những người chưa có tọa độ
  const missingCoordinates = rows.filter(
    (person) => person.lat == null || person.lng == null,
  );

  // for (const person of missingCoordinates) {
  //   // Không có address thì bỏ qua
  //   if (!person.address) {
  //     continue;
  //   }

  //   const coordinates = await geocodeAddress(person.address);

  //   if (!coordinates) {
  //     continue;
  //   }

  //   const { lat, lng } = coordinates;

  //   // Update database
  //   await db.query(
  //     `UPDATE users
  //      SET lat = $1,
  //          lng = $2
  //      WHERE id = $3`,
  //     [lat, lng, person.id],
  //   );

  //   // Update object hiện tại để trả về FE
  //   person.lat = lat;
  //   person.lng = lng;
  // }

  geocodeMissingDqcd(rows).catch((error) => {
    console.error("[GEOCODE] Background job failed:", error);
  });

  return rows;

  return rows;
};

const fetchTuoi17 = async (neighborhoodFilter) => {
  const params = [];
  const neighborhoodClause = buildNeighborhoodClause(
    "neighborhood",
    neighborhoodFilter,
    params,
  );

  const { rows } = await db.query(
    `SELECT
       id,
       full_name,
       'tuoi_17' AS type,
       neighborhood,
       permanent_address,
       temporary_address,
       date_of_birth
     FROM youth_personnel
     WHERE TRUE
       ${neighborhoodClause}
     ORDER BY full_name ASC`,
    params,
  );

  return attachCoordinates(rows);
};

const fetchQndb = async (neighborhoodFilter) => {
  const params = [];

  const neighborhoodClause = buildNeighborhoodClause(
    "neighborhood",
    neighborhoodFilter,
    params,
  );

  const { rows } = await db.query(
    `SELECT
       id,
       full_name,
       'quan_nhan_du_bi' AS type,
       neighborhood,
       permanent_address,
       temporary_address,
       service_start_date,
       date_of_birth
     FROM quan_nhan_du_bi
     WHERE TRUE
       ${neighborhoodClause}
     ORDER BY full_name ASC`,
    params,
  );

  return attachCoordinates(rows);
};

const fetchMapPersonnel = async (requester, filters = {}) => {
  const { role, user_id } = requester;

  if (!ALLOWED_ROLES.has(role)) {
    throw new ForbiddenError("Không có quyền truy cập module bản đồ");
  }

  let allowedTypes = [...PERSONNEL_TYPES];
  let neighborhoodFilter = filters.neighborhood ?? null;

  if (role === "DQTT") {
    neighborhoodFilter = await resolveDqttNeighborhoodFilter(user_id);
    if (!neighborhoodFilter) {
      throw new ForbiddenError("DQTT không có khu phố phụ trách");
    }
    allowedTypes = ["dqcd", "tuoi_17"];
  }

  let typesToFetch = allowedTypes;
  if (filters.type) {
    if (!allowedTypes.includes(filters.type)) {
      return [];
    }
    typesToFetch = [filters.type];
  }

  const fetchers = {
    dqcd: fetchDqcd,
    tuoi_17: fetchTuoi17,
    quan_nhan_du_bi: fetchQndb,
  };

  const rows = [];
  for (const type of typesToFetch) {
    const typeRows = await fetchers[type](neighborhoodFilter);
    rows.push(...typeRows);
  }

  return rows.map(formatPerson);
};

module.exports = {
  fetchMapPersonnel,
};
