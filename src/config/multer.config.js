"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { cleanupFile } = require("../middlewares/cleanupFile.middleware");

// ===== INIT UPLOAD DIRECTORY =====
const dir = path.resolve(__dirname, "../upload");
let uploadDir = dir;
const tempDir = path.join(os.tmpdir(), "app-uploads");

try {
  if (!fs.existsSync(dir)) {
    console.log(`Upload directory doesn't exist, creating: ${dir}`);
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
  }

  const testFile = path.join(dir, ".test-write-permissions");
  fs.writeFileSync(testFile, "test");
  fs.unlinkSync(testFile);

  console.log(`✓ Upload directory ${dir} is writable`);
} catch (err) {
  console.error(`Error with primary upload directory: ${err.message}`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
    }

    const tempTestFile = path.join(tempDir, ".test-write-permissions");
    fs.writeFileSync(tempTestFile, "test");
    fs.unlinkSync(tempTestFile);

    console.log(`⚠️ Falling back to temp directory: ${tempDir}`);
    uploadDir = tempDir;
  } catch (tempErr) {
    console.error("Critical error: Cannot write upload directory!");
    console.error(tempErr.message);
  }
}

// ===== STORAGE =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename =
      file.fieldname + "-" + uniqueSuffix + path.extname(sanitizedName);

    console.log(`Creating file: ${filename}`);
    cb(null, filename);
  },
});

// ===== COMMON FILTER HELPER =====
const checkFile = (file, allowedMimes, allowedExts) => {
  const isMimeAllowed = allowedMimes.includes(file.mimetype);
  const isExtAllowed = allowedExts.test(path.extname(file.originalname));
  return isMimeAllowed || isExtAllowed; // FIXED (|| instead of &&)
};

// ===== IMAGE + VIDEO =====
const mediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/jpg",
  "image/webp",
  "video/mp4",
  "video/mkv",
  "video/webm",
  "video/mpeg",
  "video/quicktime",
];

const mediaExtensions = /\.(jpeg|jpg|png|gif|mp4|mkv|mov|webm|webp|mpeg)$/i;

const mediaFilter = (req, file, cb) => {
  if (checkFile(file, mediaMimeTypes, mediaExtensions)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"), false);
  }
};

const uploadDisk = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFilter,
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mediaFilter,
});

// ===== EXCEL =====
const excelMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

const excelExtensions = /\.(xlsx|xls)$/i;

const excelFilter = (req, file, cb) => {
  if (checkFile(file, excelMimeTypes, excelExtensions)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files are allowed"), false);
  }
};

const uploadExcel = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: excelFilter,
});

// ===== DOCUMENT (PDF + WORD) =====
const documentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const documentExtensions = /\.(pdf|doc|docx)$/i;

const documentFilter = (req, file, cb) => {
  if (checkFile(file, documentMimeTypes, documentExtensions)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and Word files are allowed"), false);
  }
};

const uploadDocument = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFilter,
});

const uploadDocumentMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: documentFilter,
});

// ===== HANDLE ERROR =====
const handleMulterError = (err, req, res, next) => {
  // cleanup
  if (req.file) cleanupFile(req.file.path);

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((file) => cleanupFile(file.path));
    } else {
      Object.values(req.files).forEach((fileArray) => {
        if (Array.isArray(fileArray)) {
          fileArray.forEach((file) => cleanupFile(file.path));
        }
      });
    }
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File size exceeds limit",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "error",
        message: `Unexpected field: ${err.field}`,
      });
    }

    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }

  next();
};

// ===== EXPORT =====
module.exports = {
  uploadDisk,
  uploadExcel,
  uploadDocument,
  uploadMemory,
  uploadDocumentMemory,
  handleMulterError,
};
