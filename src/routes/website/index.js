"use strict";

const express = require("express");
const router = express.Router();

const articleController = require("../../controllers/website-article.controller");
const documentController = require("../../controllers/website-document.controller");
const slideController = require("../../controllers/website-slide.controller");
const contactController = require("../../controllers/website-contact.controller");
const quickLinkController = require("../../controllers/website-quick-link.controller");
const validate = require("../../middlewares/validate");
const { authentication } = require("../../middlewares/auth.middleware");
const {
  uploadDocumentMemory,
  uploadImageMemory,
  handleMulterError,
} = require("../../config/multer.config");
const { requireRole } = require("../../middlewares/role.middleware");
const websiteValidation = require("../../validations/website.validation");

const contentRoles = ["DQTT", "TO_TRUONG", "CHI_HUY", "ADMIN"];
const managerRoles = ["CHI_HUY", "ADMIN"];

router.get(
  "/articles",
  validate(websiteValidation.publicArticles),
  articleController.listPublic,
);
router.get(
  "/articles/:id",
  validate(websiteValidation.idParam),
  articleController.getPublicById,
);
router.get(
  "/documents",
  validate(websiteValidation.publicDocuments),
  documentController.listPublic,
);
router.get(
  "/slides",
  validate(websiteValidation.publicSlides),
  slideController.listPublic,
);

router.get(
  "/quick-links",
  validate(websiteValidation.publicQuickLinks),
  quickLinkController.listPublic,
);
router.post(
  "/contacts",
  // validate(websiteValidation.createContact),
  contactController.create,
);

router.get(
  "/admin/articles",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.adminArticles),
  articleController.listAdmin,
);
router.post(
  "/admin/articles",
  authentication,
  requireRole(contentRoles),
  uploadImageMemory.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  handleMulterError,
  validate(websiteValidation.createArticle),
  articleController.create,
);
router.put(
  "/admin/articles/:id",
  authentication,
  requireRole(contentRoles),
  uploadImageMemory.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  handleMulterError,
  validate(websiteValidation.updateArticle),
  articleController.update,
);
router.delete(
  "/admin/articles/:id",
  authentication,
  validate(websiteValidation.idParam),
  articleController.remove,
);
router.patch(
  "/admin/articles/:id/toggle-visible",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.idParam),
  articleController.toggleVisible,
);

router.get(
  "/admin/documents",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.adminDocuments),
  documentController.listAdmin,
);
router.post(
  "/admin/documents",
  authentication,
  requireRole(contentRoles),
  uploadDocumentMemory.single("file"),
  handleMulterError,
  validate(websiteValidation.createDocument),
  documentController.create,
);
router.put(
  "/admin/documents/:id",
  authentication,
  requireRole(contentRoles),
  uploadDocumentMemory.single("file"),
  handleMulterError,
  validate(websiteValidation.updateDocument),
  documentController.update,
);
router.delete(
  "/admin/documents/:id",
  authentication,
  validate(websiteValidation.idParam),
  documentController.remove,
);

router.get(
  "/admin/slides",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.adminSlides),
  slideController.listAdmin,
);
router.post(
  "/admin/slides",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.createSlide),
  slideController.create,
);
router.put(
  "/admin/slides/:id",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.updateSlide),
  slideController.update,
);
router.delete(
  "/admin/slides/:id",
  authentication,
  validate(websiteValidation.idParam),
  slideController.remove,
);

router.get(
  "/admin/quick-links",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.adminQuickLinks),
  quickLinkController.listAdmin,
);
router.post(
  "/admin/quick-links",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.createQuickLink),
  quickLinkController.create,
);
router.put(
  "/admin/quick-links/:id",
  authentication,
  requireRole(contentRoles),
  validate(websiteValidation.updateQuickLink),
  quickLinkController.update,
);
router.delete(
  "/admin/quick-links/:id",
  authentication,
  validate(websiteValidation.idParam),
  quickLinkController.remove,
);

router.get(
  "/admin/contacts",
  authentication,
  requireRole(managerRoles),
  validate(websiteValidation.adminContacts),
  contactController.listAdmin,
);
router.patch(
  "/admin/contacts/:id/read",
  authentication,
  requireRole(managerRoles),
  validate(websiteValidation.idParam),
  contactController.markRead,
);
router.patch(
  "/admin/contacts/:id/status",
  authentication,
  requireRole(managerRoles),
  validate(websiteValidation.updateContactStatus),
  contactController.updateStatus,
);

module.exports = router;
