"use strict";

const crypto = require("crypto");
const path = require("path");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { r2Client } = require("../config/r2.config");

const trimSlashes = (value) => String(value || "").replace(/^\/+|\/+$/g, "");

const uploadToR2 = async (
  buffer,
  originalName,
  mimetype,
  folder = "uploads",
) => {
  const safeFolder = trimSlashes(folder) || "uploads";
  const ext = path.extname(originalName || "");
  const randomHex = crypto.randomBytes(4).toString("hex");
  const key = `${safeFolder}/${Date.now()}-${randomHex}${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return `${trimSlashes(process.env.R2_PUBLIC_URL)}/${key}`;
};

const deleteFromR2 = async (fileUrl) => {
  const publicUrl = trimSlashes(process.env.R2_PUBLIC_URL);
  const key = String(fileUrl || "").replace(`${publicUrl}/`, "");

  if (!key || key === fileUrl) return;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
};

module.exports = { uploadToR2, deleteFromR2 };
