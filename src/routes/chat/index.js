"use strict";

const express = require("express");
const ChatController = require("../../controllers/chat.controller");
const validate = require("../../middlewares/validate");
const { chatValidation } = require("../../validations/chat.validation");

const router = express.Router();

router.post(
  "/",
  // authentication, // tmp remove
  // validate(chatValidation),
  ChatController.chat,
);
router.post(
  "/v2",
  // authentication, // tmp remove
  // validate(chatValidation),
  ChatController.chatV2,
);

module.exports = router;
