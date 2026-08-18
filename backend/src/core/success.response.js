"use strict";

const { StatusCode, ReasonStatusCode } = require("../constant/https.constant");

class SuccessResponse {
  constructor({
    message,
    statusCode = StatusCode.OK,
    reasonStatusCode = ReasonStatusCode.OK,
    metaData = {},
  }) {
    this.message = !message ? reasonStatusCode : message;
    this.status = statusCode;

    this.metaData = metaData;
  }

  send(res, headers = {}) {
    return res.status(this.status).json(this);
  }
}

class SUCCESS extends SuccessResponse {
  constructor({ message, metaData }) {
    super({ message, metaData });
  }
}

class CREATED extends SuccessResponse {
  constructor({
    message,
    statusCode = StatusCode.CREATED,
    reasonStatusCode = ReasonStatusCode.CREATED,
    metaData,
  }) {
    super({ message, statusCode, reasonStatusCode, metaData });
  }
}

module.exports = { SUCCESS, CREATED, SuccessResponse };
