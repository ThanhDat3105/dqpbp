"use strict";
const StatusCode = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const ReasonStatusCode = {
  OK: "Success",
  CREATED: "Created",
  ACCEPTED: "Accepted",
  NO_CONTENT: "No Content",
  BAD_REQUEST: "Bad Request",
  UNAUTHORIZED: "Unauthorized",
  PAYMENT_REQUIRED: "Payment Required",
  FORBIDDEN: "Forbidden",
  NOT_FOUND: "Not Found",
  CONFLICT: "Conflict",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  SERVICE_UNAVAILABLE: "Service Unavailable",
  GATEWAY_TIMEOUT: "Gateway Timeout",
};

const Role = {
  WRITER: "WRITER",
  EDITOR: "EDITOR",
  ADMIN: "ADMIN",
};

const HEADER = {
  API_KEY: "x-api-key",
  CLIENT_ID: "x-client-id",
  AUTHORIZATION: "authorization",
  REFRESH_TOKEN: "x-refresh-token",
};

const Notification = {
  ORDER_001: "ORDER-001",
  ORDER_002: "ORDER-002:",
  PROMOTION_001: "PROMOTION-001",
  SHOP_001: "SHOP-001",
};

const STATUS = {
  PENDING: "Pending",
  SUCCESS: "Success",
  ERROR: "Error",
  CANCEL: "Cancel",
  FAILED: "Failed",
};

const STATUS_ACTIVE = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  HIDDEN: "hidden",
};
module.exports = {
  StatusCode,
  ReasonStatusCode,
  Role,
  HEADER,
  Notification,
  STATUS,
  STATUS_ACTIVE,
};
