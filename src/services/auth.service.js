"use strict";

const pool = require("../config/db");
const { hashPassword, comparePassword, hashToken } = require("../utils/hash");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} = require("../utils/jwt");
const {
  ConflictRequestError,
  AuthFailureError,
  NotFoundError,
  BadRequestError,
} = require("../core/error.response");

const XLSX = require("xlsx");

const IMPORT_ROLES = ["ADMIN", "CHI_HUY", "TO_TRUONG", "DQTT", "DQCD"];
const DEPARTMENT_OPTIONAL_ROLES = ["ADMIN", "CHI_HUY", "DQCD"];

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
  name: ["name", "ho_ten", "ho_va_ten", "ten"],
  email: ["email", "account", "tai_khoan", "username", "user_name"],
  password: ["password", "mat_khau", "pass"],
  role: ["role", "vai_tro", "quyen"],
  military_rank: ["military_rank", "bac_ham"],
  position: ["position", "chuc_vu"],
  department_id: ["department_id", "don_vi_id"],
  department_code: [
    "department_code",
    "department",
    "don_vi",
    "ma_don_vi",
    "code",
  ],
  is_special: ["is_special", "special", "khong_can_don_vi", "khong_co_don_vi"],
  phone: ["phone", "so_dien_thoai", "dien_thoai", "sdt"],
  address: ["address", "dia_chi"],
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

const normalizeRole = (value) => {
  const role = getCellText(value).toUpperCase();
  return IMPORT_ROLES.includes(role) ? role : "DQCD";
};

const parseImportBoolean = (value) => {
  const raw = getCellText(value).toLowerCase();
  return ["true", "1", "yes", "y", "co", "có", "da", "đã", "x"].includes(raw);
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// ─── Helpers ─────────────────────────────────────────────────

const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.department_id, d.code AS department, u.is_active
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.email = $1
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

// ─── AUTH ────────────────────────────────────────────────────

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) throw new AuthFailureError("Invalid credentials");

  if (!user.is_active) {
    throw new AuthFailureError("Account deactivated");
  }

  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) throw new AuthFailureError("Invalid credentials");

  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken({ user_id: user.id });

  // 🔥 HASH TOKEN
  const accessHash = hashToken(access_token);
  const refreshHash = hashToken(refresh_token);

  // 🔥 Lưu access token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash)
     DO UPDATE SET 
       revoked = EXCLUDED.revoked,
       expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 🔥 Lưu refresh token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, refreshHash],
  );

  return {
    token: { access_token, refresh_token },
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  };
};

// ─── REFRESH ─────────────────────────────────────────────────

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthFailureError("Invalid or expired refresh token");
  }

  const userId = decoded.user_id;
  const refreshHash = hashToken(refreshToken);

  // 🔥 check refresh token
  const { rows } = await pool.query(
    `SELECT revoked FROM tokens
     WHERE token_hash = $1 AND type = 'refresh'
     LIMIT 1`,
    [refreshHash],
  );

  if (rows.length === 0) {
    throw new AuthFailureError("Refresh token not found");
  }

  if (rows[0].revoked) {
    throw new AuthFailureError("Refresh token revoked");
  }

  // 🔥 revoke refresh cũ
  await pool.query(`UPDATE tokens SET revoked = true WHERE token_hash = $1`, [
    refreshHash,
  ]);

  // 🔥 revoke ALL access token cũ
  await pool.query(
    `UPDATE tokens SET revoked = true 
     WHERE user_id = $1 AND type = 'access'`,
    [userId],
  );

  // load user
  const { rows: userRows } = await pool.query(
    `SELECT id, email, role, is_active 
     FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );

  const user = userRows[0];
  if (!user || !user.is_active) {
    throw new AuthFailureError("User invalid");
  }

  // 🔥 tạo token mới
  const newAccessToken = signAccessToken({
    user_id: user.id,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = signRefreshToken({
    user_id: user.id,
  });

  const accessHash = hashToken(newAccessToken);
  const newRefreshHash = hashToken(newRefreshToken);

  // 🔥 lưu access mới
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash) DO UPDATE SET revoked = false, expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 🔥 lưu refresh mới
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, newRefreshHash],
  );

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  };
};

// ─── LOGOUT ─────────────────────────────────────────────────

const logout = async (token) => {
  let userId = null;
  let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7d

  try {
    const decoded = verifyAccessToken(token);
    userId = decoded.user_id;
    expiresAt = new Date(decoded.exp * 1000);
  } catch {
    // Token expired or invalid — still blacklist it by hash
    const jwtLib = require("jsonwebtoken");
    const raw = jwtLib.decode(token);
    if (raw) {
      userId = raw.user_id;
      expiresAt = raw.exp ? new Date(raw.exp * 1000) : expiresAt;
    }
  }

  const tokenHash = hashToken(token);

  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', true, NOW(), $3)
     ON CONFLICT (token_hash)
     DO UPDATE SET revoked = true`,
    [userId, tokenHash, expiresAt],
  );

  return { message: "Logged out successfully" };
};

// ─── GET ME ─────────────────────────────────────────────────

const getMe = async (userId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.role, u.military_rank, u.department_id,
       d.code AS department, d.name AS department_name, u.position
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = $1 AND u.is_active = true
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};

const register = async ({
  name,
  email,
  password,
  department,
  role,
  phone,
  address,
  neighborhood,
}) => {
  // 1. Check email đã tồn tại chưa
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new ConflictRequestError("Email already exists");
  }

  let departmentId = null;
  if (department) {
    departmentId = Number(department);

    const { rows: departmentRows } = await pool.query(
      `SELECT id FROM departments WHERE id = $1 LIMIT 1`,
      [departmentId],
    );

    if (departmentRows.length === 0) {
      throw new BadRequestError("department does not exist");
    }
  }

  // 2. Hash password
  const passwordHash = await hashPassword(password);

  const { rows } = await pool.query(
    `WITH new_user AS (
       INSERT INTO users (name, email, password_hash, role, department_id, phone, address, neighborhood, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
       RETURNING id, name, email, role, department_id
     )
     SELECT u.*, d.code AS department
     FROM new_user u
     LEFT JOIN departments d ON u.department_id = d.id`,
    [
      name,
      email,
      passwordHash,
      role,
      departmentId || null,
      phone || null,
      address || null,
      neighborhood || null,
    ],
  );

  const user = rows[0];

  // 4. Tạo token giống login
  const payload = {
    user_id: user.id,
    email: user.email,
    role: user.role,
  };

  const access_token = signAccessToken(payload);
  const refresh_token = signRefreshToken({ user_id: user.id });

  // 5. Hash token
  const accessHash = hashToken(access_token);
  const refreshHash = hashToken(refresh_token);

  // 6. Lưu access token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'access', false, NOW(), NOW() + INTERVAL '1 hour')
     ON CONFLICT (token_hash)
     DO UPDATE SET revoked = false, expires_at = EXCLUDED.expires_at`,
    [user.id, accessHash],
  );

  // 7. Lưu refresh token
  await pool.query(
    `INSERT INTO tokens (user_id, token_hash, type, revoked, created_at, expires_at)
     VALUES ($1, $2, 'refresh', false, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (token_hash) DO NOTHING`,
    [user.id, refreshHash],
  );

  // 8. Return giống login
  return {
    token: {
      access_token,
      refresh_token,
    },
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
    },
  };
};

const importUsersFromExcel = async (filePath) => {
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
  if (headerMap.email === undefined || headerMap.password === undefined) {
    throw new BadRequestError(
      "File Excel phai co cot email/tai_khoan va password/mat_khau",
    );
  }

  const rowsToInsert = [];
  const errors = [];
  const seenEmails = new Set();

  excelRows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some((cell) => getCellText(cell))) return;

    const email = getCellText(row[headerMap.email]).toLowerCase();
    const password = getCellText(row[headerMap.password]);
    const name =
      headerMap.name === undefined
        ? email.split("@")[0]
        : getCellText(row[headerMap.name]) || email.split("@")[0];
    const role =
      headerMap.role === undefined
        ? "DQCD"
        : normalizeRole(row[headerMap.role]);
    const isSpecial =
      DEPARTMENT_OPTIONAL_ROLES.includes(role) ||
      (headerMap.is_special !== undefined &&
        parseImportBoolean(row[headerMap.is_special]));

    if (!email || !isValidEmail(email)) {
      errors.push({ row: rowNumber, message: "Email/tai_khoan khong hop le" });
      return;
    }

    if (seenEmails.has(email)) {
      errors.push({
        row: rowNumber,
        message: "Email bi trung trong file Excel",
      });
      return;
    }

    if (!password || password.length < 6) {
      errors.push({
        row: rowNumber,
        message: "Password phai co it nhat 6 ky tu",
      });
      return;
    }

    const rawDepartmentId =
      headerMap.department_id === undefined
        ? ""
        : getCellText(row[headerMap.department_id]);
    const departmentId = rawDepartmentId ? Number(rawDepartmentId) : null;
    const departmentCode =
      headerMap.department_code === undefined
        ? ""
        : getCellText(row[headerMap.department_code]);

    if (
      !isSpecial &&
      (!departmentId || !Number.isInteger(departmentId) || departmentId <= 0) &&
      !departmentCode
    ) {
      errors.push({
        row: rowNumber,
        message: "Thieu department_id hoac department_code/ma_don_vi",
      });
      return;
    }

    seenEmails.add(email);
    rowsToInsert.push({
      row: rowNumber,
      name,
      email,
      password,
      role,
      is_special: isSpecial,
      military_rank:
        headerMap.military_rank === undefined
          ? null
          : getCellText(row[headerMap.military_rank]) || null,
      position:
        headerMap.position === undefined
          ? null
          : getCellText(row[headerMap.position]) || null,
      department_id: departmentId,
      department_code: departmentCode,
      phone:
        headerMap.phone === undefined
          ? null
          : getCellText(row[headerMap.phone]) || null,
      address:
        headerMap.address === undefined
          ? null
          : getCellText(row[headerMap.address]) || null,
    });
  });

  if (rowsToInsert.length === 0) {
    return {
      imported: 0,
      failed: errors.length,
      errors,
    };
  }

  const { rows: existingRows } = await pool.query(
    `SELECT email FROM users WHERE email = ANY($1)`,
    [rowsToInsert.map((item) => item.email)],
  );
  const existingEmails = new Set(
    existingRows.map((row) => row.email.toLowerCase()),
  );

  const departmentIds = [
    ...new Set(
      rowsToInsert
        .map((item) => item.department_id)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
  const departmentCodes = [
    ...new Set(
      rowsToInsert
        .map((item) => item.department_code)
        .filter(Boolean)
        .map((code) => code.toLowerCase()),
    ),
  ];
  const { rows: departmentRows } = await pool.query(
    `SELECT id, LOWER(code) AS code
     FROM departments
     WHERE id = ANY($1::int[]) OR LOWER(code) = ANY($2::text[])`,
    [departmentIds, departmentCodes],
  );
  const validDepartmentIds = new Set(departmentRows.map((row) => row.id));
  const departmentIdByCode = new Map(
    departmentRows.map((row) => [row.code, row.id]),
  );

  const validRows = rowsToInsert.filter((item) => {
    if (existingEmails.has(item.email)) {
      errors.push({
        row: item.row,
        message: "Email da ton tai trong he thong",
      });
      return false;
    }

    if (item.department_id && validDepartmentIds.has(item.department_id)) {
      return true;
    }

    const departmentId = item.department_code
      ? departmentIdByCode.get(item.department_code.toLowerCase())
      : null;
    if (departmentId) {
      item.department_id = departmentId;
      return true;
    }

    if (item.is_special) {
      item.department_id = null;
      return true;
    }

    errors.push({
      row: item.row,
      message: "department_id/department_code khong ton tai",
    });
    return false;
  });

  if (validRows.length === 0) {
    return {
      imported: 0,
      failed: errors.length,
      errors,
    };
  }

  if (validRows.some((item) => item.department_id === null)) {
    const { rows: columnRows } = await pool.query(
      `SELECT is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'department_id'
       LIMIT 1`,
    );

    if (columnRows[0]?.is_nullable === "NO") {
      throw new BadRequestError(
        "users.department_id dang NOT NULL. Hay cho phep NULL truoc khi import user dac biet.",
      );
    }
  }

  const client = await pool.connect();
  const inserted = [];

  try {
    await client.query("BEGIN");

    for (const item of validRows) {
      const passwordHash = await hashPassword(item.password);
      const { rows } = await client.query(
        `INSERT INTO users
           (name, email, password_hash, role, military_rank, position, department_id, phone, address, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
         RETURNING id, name, email, role, military_rank, position, department_id`,
        [
          item.name,
          item.email,
          passwordHash,
          item.role,
          item.military_rank,
          item.position,
          item.department_id,
          item.phone,
          item.address,
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

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getMe,
  register,
  importUsersFromExcel,
};
