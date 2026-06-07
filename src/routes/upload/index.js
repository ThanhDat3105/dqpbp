"use strict";

const express = require("express");
const router = express.Router();
const {
  uploadMemory,
  uploadDocumentMemory,
  handleMulterError,
} = require("../../config/multer.config");
const { uploadToR2, deleteFromR2 } = require("../../services/r2.service");
const { authentication } = require("../../middlewares/auth.middleware");
const { SUCCESS } = require("../../core/success.response");

// POST /api/upload/single  — image/video
router.post(
  "/single",
  authentication,
  (req, res, next) => uploadMemory.single("file")(req, res, next),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file provided" });

      const folder = req.query.folder || "uploads";
      const url = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder,
      );

      new SUCCESS({ message: "Upload successful", metaData: { url } }).send(res);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/upload/document  — pdf/doc/docx
router.post(
  "/document",
  authentication,
  (req, res, next) => uploadDocumentMemory.single("file")(req, res, next),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file provided" });

      const folder = req.query.folder || "documents";
      const url = await uploadToR2(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder,
      );

      new SUCCESS({ message: "Upload successful", metaData: { url } }).send(res);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/upload  — xóa file theo URL
router.delete("/", authentication, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "url is required" });

    await deleteFromR2(url);
    new SUCCESS({ message: "Deleted successfully" }).send(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
