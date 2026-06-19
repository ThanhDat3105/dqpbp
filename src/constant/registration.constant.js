"use strict";

const REGISTRATION_CATEGORIES = ["tsqs", "tuoi17", "tinhnguyen", "dqtt"];

const REGISTRATION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const VN_PHONE_PATTERN = /^0\d{9}$/;

const RATE_LIMIT = {
  WINDOW_MS: 60 * 60 * 1000,
  MAX_PER_IP: 10,
  MAX_PER_PHONE: 10,
};

module.exports = {
  REGISTRATION_CATEGORIES,
  REGISTRATION_STATUS,
  VN_PHONE_PATTERN,
  RATE_LIMIT,
};
