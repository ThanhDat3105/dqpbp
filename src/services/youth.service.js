"use strict";

const db = require("../config/db");
const XLSX = require("xlsx");
const { NotFoundError, BadRequestError } = require("../core/error.response");

const normalizeHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const headerAliases = {
  full_name: ["full_name", "ho_va_ten", "ho_ten", "ten"],
  date_of_birth: [
    "date_of_birth",
    "ngay_sinh",
    "ngay_thang_nam_sinh",
    "ngay_thang_nam",
  ],
  neighborhood: ["neighborhood", "khu_pho", "khupho"],
  permanent_address: ["permanent_address", "dia_chi_thuong_tru", "dia_chi"],
  education_level: [
    "education_level",
    "trinh_do",
    "trinh_do_van_hoa",
    "hoc_van",
  ],
  is_registered: ["is_registered", "da_lam_ho_so", "trang_thai"],
};

const getCellText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const parseBoolean = (value) => {
  const raw = getCellText(value).toLowerCase();
  return ["true", "1", "yes", "y", "co", "có", "da", "đã", "x"].includes(raw);
};

const buildImportHeaderMap = (headerRow) => {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  return Object.entries(headerAliases).reduce((map, [field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );
    if (index >= 0) map[field] = index;
    return map;
  }, {});
};

const parseDateOfBirth = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const raw = getCellText(value);
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dmyMatch = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return parsedDate.toISOString().slice(0, 10);
};

const AUTO_PROMOTE_NOTE = "Tự động chuyển từ tuổi 17 khi đủ 18 tuổi";

const promoteYouthToNguon = async (client, youth, { note = null } = {}) => {
  const { rows } = await client.query(
    `INSERT INTO nguon
       (full_name, date_of_birth, permanent_address, temporary_address,
        phone, education_level, youth_personnel_id, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      youth.full_name,
      youth.date_of_birth,
      youth.permanent_address,
      youth.temporary_address,
      youth.phone,
      youth.education_level,
      youth.id,
      note,
    ],
  );

  await client.query(`DELETE FROM youth_personnel WHERE id = $1`, [youth.id]);

  return rows[0];
};

const findEligibleForAutoPromote = async (client) => {
  const { rows } = await client.query(
    `SELECT y.*
     FROM youth_personnel y
     WHERE y.date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')
       AND NOT EXISTS (
         SELECT 1 FROM nguon n WHERE n.youth_personnel_id = y.id
       )
     ORDER BY y.id ASC`,
  );

  return rows;
};

const autoPromoteEligibleYouth = async () => {
  const client = await db.connect();

  try {
    const eligible = await findEligibleForAutoPromote(client);

    if (eligible.length === 0) {
      return { promoted: 0, records: [] };
    }

    await client.query("BEGIN");

    const records = [];
    for (const youth of eligible) {
      const record = await promoteYouthToNguon(client, youth, {
        note: AUTO_PROMOTE_NOTE,
      });
      records.push(record);
    }

    await client.query("COMMIT");

    return {
      promoted: records.length,
      records,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── 1. List với filter + pagination ─────────────────────────────────────────
const fetchList = async (filters) => {
  const { search, is_registered, page, limit } = filters;
  const offset = (page - 1) * limit;

  const params = [
    search ?? null,
    is_registered !== undefined ? is_registered : null,
    limit,
    offset,
  ];

  const { rows } = await db.query(
    `SELECT
       id, full_name, date_of_birth, neighborhood,
       permanent_address, phone, education_level, is_registered
     FROM youth_personnel
     WHERE
       ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
       AND ($2::boolean IS NULL OR is_registered = $2)
     ORDER BY id ASC
     LIMIT $3 OFFSET $4`,
    params,
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM youth_personnel
     WHERE
       ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
       AND ($2::boolean IS NULL OR is_registered = $2)`,
    [search ?? null, is_registered !== undefined ? is_registered : null],
  );

  return {
    data: rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      date_of_birth: r.date_of_birth,
      neighborhood: r.neighborhood,
      permanent_address: r.permanent_address,
      phone: r.phone,
      education_level: r.education_level,
      is_registered: r.is_registered,
    })),
    page,
    limit,
    total: Number(countRows[0].total),
  };
};

// ─── 2. Detail by ID ─────────────────────────────────────────────────────────
const fetchById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM youth_personnel WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ tuổi 17 với id = ${id}`);
  }
  return rows[0];
};

// ─── 3. Create ───────────────────────────────────────────────────────────────
const createYouth = async (payload) => {
  const {
    full_name,
    date_of_birth,
    neighborhood = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    is_registered = false,
  } = payload;
  const { rows } = await db.query(
    `INSERT INTO youth_personnel
         (full_name, date_of_birth, neighborhood, permanent_address, temporary_address, phone, education_level, is_registered)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
    [
      full_name,
      date_of_birth,
      neighborhood,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      is_registered,
    ],
  );
  return rows[0];
};

const importYouthFromExcel = async (filePath) => {
  if (!filePath) {
    throw new BadRequestError("Vui long chon file Excel");
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestError("File Excel khong co sheet du lieu");
  }

  const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    raw: false,
  });

  if (excelRows.length < 2) {
    throw new BadRequestError("File Excel can co dong tieu de va du lieu");
  }

  const headerMap = buildImportHeaderMap(excelRows[0]);
  if (headerMap.full_name === undefined) {
    throw new BadRequestError("File Excel phai co cot full_name hoac Ho ten");
  }
  if (headerMap.date_of_birth === undefined) {
    throw new BadRequestError(
      "File Excel phai co cot date_of_birth hoac Ngay sinh",
    );
  }

  const rowsToInsert = [];
  const errors = [];

  excelRows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const fullName = getCellText(row[headerMap.full_name]);
    const dateOfBirth = parseDateOfBirth(row[headerMap.date_of_birth]);

    if (!row.some((cell) => getCellText(cell))) return;

    if (!fullName) {
      errors.push({ row: rowNumber, message: "Thieu full_name" });
      return;
    }
    if (!dateOfBirth) {
      errors.push({ row: rowNumber, message: "date_of_birth khong hop le" });
      return;
    }

    rowsToInsert.push({
      row: rowNumber,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      neighborhood:
        headerMap.neighborhood === undefined
          ? null
          : getCellText(row[headerMap.neighborhood]) || null,
      permanent_address:
        headerMap.permanent_address === undefined
          ? null
          : getCellText(row[headerMap.permanent_address]) || null,
      education_level:
        headerMap.education_level === undefined
          ? null
          : getCellText(row[headerMap.education_level]) || null,
      is_registered:
        headerMap.is_registered === undefined
          ? false
          : parseBoolean(row[headerMap.is_registered]),
    });
  });

  if (rowsToInsert.length === 0) {
    return {
      imported: 0,
      failed: errors.length,
      errors,
    };
  }

  const client = await db.connect();
  const inserted = [];

  try {
    await client.query("BEGIN");

    for (const item of rowsToInsert) {
      const { rows } = await client.query(
        `INSERT INTO youth_personnel
          (full_name, date_of_birth, neighborhood, permanent_address, education_level, is_registered)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name`,
        [
          item.full_name,
          item.date_of_birth,
          item.neighborhood,
          item.permanent_address,
          item.education_level,
          item.is_registered,
        ],
      );

      inserted.push({ row: item.row, ...rows[0] });
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return {
    imported: inserted.length,
    failed: errors.length,
    inserted,
    errors,
  };
};

// ─── 4. Update (COALESCE — chỉ update fields được gửi) ───────────────────────
const updateYouth = async (id, payload) => {
  // Đảm bảo bản ghi tồn tại trước
  await fetchById(id);

  const {
    full_name = null,
    date_of_birth = null,
    neighborhood = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    is_registered = null,
  } = payload;

  const { rows } = await db.query(
    `UPDATE youth_personnel
     SET
       full_name         = COALESCE($1, full_name),
       date_of_birth     = COALESCE($2, date_of_birth),
       neighborhood      = COALESCE($3, neighborhood),
       permanent_address = COALESCE($4, permanent_address),
       temporary_address = COALESCE($5, temporary_address),
       phone             = COALESCE($6, phone),
       education_level   = COALESCE($7, education_level),
       is_registered     = COALESCE($8, is_registered),
       updated_at        = NOW()
     WHERE id = $9
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      neighborhood,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      is_registered,
      id,
    ],
  );

  return rows[0];
};

// ─── 5. Chuyển hồ sơ tuổi 17 thành Nguồn ────────────────────────────────────
const promoteToNguon = async (id) => {
  const client = await db.connect();

  try {
    const youth = await fetchById(id);

    const { rows: existing } = await client.query(
      `SELECT id FROM nguon WHERE youth_personnel_id = $1 LIMIT 1`,
      [id],
    );

    if (existing.length > 0) {
      await client.query(`DELETE FROM youth_personnel WHERE id = $1`, [id]);
      const { rows: nguonRows } = await client.query(
        `SELECT * FROM nguon WHERE id = $1`,
        [existing[0].id],
      );
      return nguonRows[0];
    }

    await client.query("BEGIN");
    const record = await promoteYouthToNguon(client, youth);
    await client.query("COMMIT");
    return record;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── 6. Delete ───────────────────────────────────────────────────────────────
const deleteYouth = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM youth_personnel WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy hồ sơ tuổi 17 với id = ${id}`);
  }
  return { deleted_id: rows[0].id };
};

module.exports = {
  fetchList,
  fetchById,
  createYouth,
  importYouthFromExcel,
  updateYouth,
  deleteYouth,
  promoteToNguon,
  autoPromoteEligibleYouth,
};
