"use strict";

const REGISTRATION_CATEGORIES = ["tsqs", "tuoi17", "tinhnguyen", "dqtt", "doituongchinhsach", "siquandubi"];

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

const TRAINING_SYSTEM = {
  CAO_DANG_DAI_HOC: "cao_dang_dai_hoc",
  THIEU_SINH_QUAN: "thieu_sinh_quan",
  LONG_GUI_NHA_HOANG: "long_gui_nha_hoang",
};

module.exports = {
  REGISTRATION_CATEGORIES,
  REGISTRATION_STATUS,
  VN_PHONE_PATTERN,
  RATE_LIMIT,
  TRAINING_SYSTEM,
};
