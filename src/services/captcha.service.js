"use strict";

const axios = require("axios");

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const verifyCaptcha = async (token, remoteIp) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    throw new Error("RECAPTCHA_SECRET_KEY is not configured");
  }

  const { data } = await axios.post(RECAPTCHA_VERIFY_URL, null, {
    params: {
      secret,
      response: token,
      remoteip: remoteIp,
    },
    timeout: 5000,
  });

  return data.success === true;
};

module.exports = { verifyCaptcha };
