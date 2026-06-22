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

const importHeaderAliases = {
  full_name: ["full_name", "ho_ten", "ho_va_ten", "ten"],
  date_of_birth: ["date_of_birth", "ngay_sinh", "ngay_thang_nam_sinh"],
  permanent_address: ["permanent_address", "dia_chi_thuong_tru", "dia_chi"],
  temporary_address: ["temporary_address", "dia_chi_tam_tru", "tam_tru"],
  phone: ["phone", "so_dien_thoai", "dien_thoai", "sdt"],
  education_level: [
    "education_level",
    "trinh_do",
    "trinh_do_van_hoa",
    "hoc_van",
  ],
  military_rank: ["military_rank", "bac_ham"],
  unit: ["unit", "don_vi"],
  neighborhood: ["neighborhood", "khu_pho", "khupho"],
  service_start_date: ["service_start_date", "ngay_nhap_ngu", "ngay_bat_dau"],
  service_end_date: ["service_end_date", "ngay_xuat_ngu", "ngay_ket_thuc"],
  reserve_class: ["reserve_class", "hang_du_bi", "hang"],
  note: ["note", "ghi_chu"],
};

const getCellText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const buildImportHeaderMap = (headerRow) => {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  return Object.entries(importHeaderAliases).reduce((map, [field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );
    if (index >= 0) map[field] = index;
    return map;
  }, {});
};

const parseExcelDate = (value) => {
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

// ─── 1. List với filter + pagination ─────────────────────────────────────────
const fetchList = async (filters) => {
  const { search, page, limit } = filters;
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `SELECT
       id, full_name, date_of_birth, neighborhood,
       permanent_address, phone, education_level,
       military_rank, unit, service_start_date,
       service_end_date, reserve_class, note
     FROM quan_nhan_du_bi
     WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')
     ORDER BY id ASC
     LIMIT $2 OFFSET $3`,
    [search ?? null, limit, offset],
  );

  const { rows: countRows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM quan_nhan_du_bi
     WHERE ($1::text IS NULL OR full_name ILIKE '%' || $1 || '%')`,
    [search ?? null],
  );

  return {
    data: rows,
    page,
    limit,
    total: Number(countRows[0].total),
  };
};

// ─── 2. Detail by ID ─────────────────────────────────────────────────────────
const fetchById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM quan_nhan_du_bi WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(
      `Không tìm thấy hồ sơ quân nhân dự bị với id = ${id}`,
    );
  }
  return rows[0];
};

// ─── 3. Create ───────────────────────────────────────────────────────────────
const createQndb = async (payload) => {
  const {
    full_name,
    date_of_birth,
    neighborhood = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    military_rank = null,
    unit = null,
    service_start_date = null,
    service_end_date = null,
    reserve_class = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `INSERT INTO quan_nhan_du_bi
       (full_name, date_of_birth, neighborhood, permanent_address, temporary_address,
        phone, education_level, military_rank, unit,
        service_start_date, service_end_date, reserve_class, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      neighborhood,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      military_rank,
      unit,
      service_start_date,
      service_end_date,
      reserve_class,
      note,
    ],
  );
  return rows[0];
};

// ─── 4. Update (COALESCE — chỉ update fields được gửi) ───────────────────────
const importQndbFromExcel = async (filePath) => {
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
  if (
    headerMap.full_name === undefined ||
    headerMap.date_of_birth === undefined
  ) {
    throw new BadRequestError(
      "File Excel phai co cot full_name va date_of_birth",
    );
  }

  const rowsToInsert = [];
  const errors = [];

  excelRows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some((cell) => getCellText(cell))) return;

    const fullName = getCellText(row[headerMap.full_name]);
    const dateOfBirth = parseExcelDate(row[headerMap.date_of_birth]);
    const serviceStartDate =
      headerMap.service_start_date === undefined
        ? null
        : row[headerMap.service_start_date];
    const serviceEndDate =
      headerMap.service_end_date === undefined
        ? null
        : row[headerMap.service_end_date];

    if (!fullName) {
      errors.push({ row: rowNumber, message: "Thieu full_name" });
      return;
    }

    if (!dateOfBirth) {
      errors.push({ row: rowNumber, message: "date_of_birth khong hop le" });
      return;
    }

    // if (
    //   headerMap.service_start_date !== undefined &&
    //   getCellText(row[headerMap.service_start_date]) &&
    //   !serviceStartDate
    // ) {
    //   errors.push({ row: rowNumber, message: "service_start_date khong hop le" });
    //   return;
    // }

    // if (
    //   headerMap.service_end_date !== undefined &&
    //   getCellText(row[headerMap.service_end_date]) &&
    //   !serviceEndDate
    // ) {
    //   errors.push({ row: rowNumber, message: "service_end_date khong hop le" });
    //   return;
    // }

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
      temporary_address:
        headerMap.temporary_address === undefined
          ? null
          : getCellText(row[headerMap.temporary_address]) || null,
      phone:
        headerMap.phone === undefined
          ? null
          : getCellText(row[headerMap.phone]) || null,
      education_level:
        headerMap.education_level === undefined
          ? null
          : getCellText(row[headerMap.education_level]) || null,
      military_rank:
        headerMap.military_rank === undefined
          ? null
          : getCellText(row[headerMap.military_rank]) || null,
      unit:
        headerMap.unit === undefined
          ? null
          : getCellText(row[headerMap.unit]) || null,
      service_start_date: serviceStartDate,
      service_end_date: serviceEndDate,
      reserve_class:
        headerMap.reserve_class === undefined
          ? null
          : getCellText(row[headerMap.reserve_class]) || null,
      note:
        headerMap.note === undefined
          ? null
          : getCellText(row[headerMap.note]) || null,
    });
  });

  if (rowsToInsert.length === 0) {
    return { imported: 0, failed: errors.length, errors };
  }

  const client = await db.connect();
  const inserted = [];

  try {
    await client.query("BEGIN");

    for (const item of rowsToInsert) {
      const { rows } = await client.query(
        `INSERT INTO quan_nhan_du_bi
           (full_name, date_of_birth, neighborhood, permanent_address, temporary_address,
            phone, education_level, military_rank, unit,
            service_start_date, service_end_date, reserve_class, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, full_name`,
        [
          item.full_name,
          item.date_of_birth,
          item.neighborhood,
          item.permanent_address,
          item.temporary_address,
          item.phone,
          item.education_level,
          item.military_rank,
          item.unit,
          item.service_start_date,
          item.service_end_date,
          item.reserve_class,
          item.note,
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

const updateQndb = async (id, payload) => {
  await fetchById(id);

  const {
    full_name = null,
    date_of_birth = null,
    neighborhood = null,
    permanent_address = null,
    temporary_address = null,
    phone = null,
    education_level = null,
    military_rank = null,
    unit = null,
    service_start_date = null,
    service_end_date = null,
    reserve_class = null,
    note = null,
  } = payload;

  const { rows } = await db.query(
    `UPDATE quan_nhan_du_bi
     SET
       full_name          = COALESCE($1,  full_name),
       date_of_birth      = COALESCE($2,  date_of_birth),
       neighborhood       = COALESCE($3,  neighborhood),
       permanent_address  = COALESCE($4,  permanent_address),
       temporary_address  = COALESCE($5,  temporary_address),
       phone              = COALESCE($6,  phone),
       education_level    = COALESCE($7,  education_level),
       military_rank      = COALESCE($8,  military_rank),
       unit               = COALESCE($9,  unit),
       service_start_date = COALESCE($10, service_start_date),
       service_end_date   = COALESCE($11, service_end_date),
       reserve_class      = COALESCE($12, reserve_class),
       note               = COALESCE($13, note),
       updated_at         = NOW()
     WHERE id = $14
     RETURNING *`,
    [
      full_name,
      date_of_birth,
      neighborhood,
      permanent_address,
      temporary_address,
      phone,
      education_level,
      military_rank,
      unit,
      service_start_date,
      service_end_date,
      reserve_class,
      note,
      id,
    ],
  );
  return rows[0];
};

// ─── 5. Delete ───────────────────────────────────────────────────────────────
const deleteQndb = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM quan_nhan_du_bi WHERE id = $1 RETURNING id`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError(
      `Không tìm thấy hồ sơ quân nhân dự bị với id = ${id}`,
    );
  }
  return { deleted_id: rows[0].id };
};

module.exports = {
  fetchList,
  fetchById,
  createQndb,
  importQndbFromExcel,
  updateQndb,
  deleteQndb,
};
