"use strict";

const express = require("express");
const router = express.Router();

const documentController = require("../../controllers/document.controller");
const { authentication } = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate");
const {
  uploadDocumentMemory,
  handleMulterError,
} = require("../../config/multer.config");
const {
  getList,
  upload,
} = require("../../validations/document.validation");

router.use(authentication);

router.get("/", validate(getList), documentController.getList);

router.post(
  "/upload",
  (req, res, next) => uploadDocumentMemory.single("file")(req, res, next),
  handleMulterError,
  validate(upload),
  documentController.upload,
);

module.exports = router;
