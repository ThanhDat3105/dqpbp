"use strict";

const db = require("../config/db");
const {
  REGISTRATION_STATUS,
  RATE_LIMIT,
} = require("../constant/registration.constant");
const { TooManyRequestsError } = require("../core/error.response");

const checkRateLimit = async ({ phone, clientIp }) => {
  const windowStart = new Date(Date.now() - RATE_LIMIT.WINDOW_MS);

  if (clientIp) {
    const { rows: ipRows } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM registrations
       WHERE client_ip = $1 AND created_at >= $2`,
      [clientIp, windowStart.toISOString()],
    );

    if (ipRows[0].count >= RATE_LIMIT.MAX_PER_IP) {
      throw new TooManyRequestsError(
        "Bạn đã gửi quá nhiều đơn đăng ký. Vui lòng thử lại sau.",
      );
    }
  }

  const { rows: phoneRows } = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM registrations
     WHERE phone = $1 AND created_at >= $2`,
    [phone, windowStart.toISOString()],
  );

  if (phoneRows[0].count >= RATE_LIMIT.MAX_PER_PHONE) {
    throw new TooManyRequestsError(
      "Số điện thoại này đã gửi quá nhiều đơn đăng ký. Vui lòng thử lại sau.",
    );
  }
};

const create = async (payload, clientIp) => {
  const {
    category,
    full_name,
    phone,
    address,
    dob,
    workplace,
    guardian_phone,
  } = payload;

  await checkRateLimit({ phone, clientIp });

  const { rows } = await db.query(
    `INSERT INTO registrations (
       category, full_name, phone, address, dob,
       workplace, guardian_phone, status, client_ip
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, category, status, created_at`,
    [
      category,
      full_name,
      phone,
      address,
      dob,
      workplace,
      guardian_phone,
      REGISTRATION_STATUS.PENDING,
      clientIp || null,
    ],
  );

  return rows[0];
};

const list = async (filters = {}) => {
  const { category, full_name, phone, address } = filters;
  const params = [];
  const where = [];

  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }

  if (full_name) {
    params.push(`%${full_name}%`);
    where.push(`full_name ILIKE $${params.length}`);
  }

  if (phone) {
    params.push(`%${phone}%`);
    where.push(`phone ILIKE $${params.length}`);
  }

  if (address) {
    params.push(`%${address}%`);
    where.push(`address ILIKE $${params.length}`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const { rows } = await db.query(
    `SELECT id, category, full_name, phone, address, dob, workplace,
            guardian_phone, status, client_ip, created_at, updated_at
     FROM registrations
     ${whereClause}
     ORDER BY created_at DESC, id DESC`,
    params,
  );

  return rows;
};

const notifyStaff = async (registration) => {
  try {
    const { rows: staff } = await db.query(
      `SELECT id FROM users
       WHERE is_active = true AND role IN ('CHI_HUY', 'DQTT', 'ADMIN')`,
    );

    const metadata = JSON.stringify({
      registration_id: registration.id,
      category: registration.category,
      full_name: registration.full_name,
    });

    for (const user of staff) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, metadata)
         VALUES ($1, 'registration', $2, $3, $4::jsonb)`,
        [
          user.id,
          "Đơn đăng ký mới",
          `Có đơn đăng ký mới loại ${registration.category}.`,
          metadata,
        ],
      );
    }
  } catch (error) {
    console.error("[Registration] Failed to notify staff:", error.message);
  }
};

module.exports = { create, list, notifyStaff, checkRateLimit };
