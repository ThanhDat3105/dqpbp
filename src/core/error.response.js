"use strict";

const { ReasonStatusCode, StatusCode } = require("../constant/https.constant");

class ErrorResponse extends Error {
  constructor(message, status) {
    super(message);

    this.status = status;
  }
}

class ConflictRequestError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.CONFLICT,
    statusCode = StatusCode.CONFLICT
  ) {
    super(message, statusCode);
  }
}

class BadRequestError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.BAD_REQUEST,
    statusCode = StatusCode.BAD_REQUEST
  ) {
    super(message, statusCode);
  }
}

class AuthFailureError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.UNAUTHORIZED,
    statusCode = StatusCode.UNAUTHORIZED
  ) {
    super(message, statusCode);
  }
}

class NotFoundError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.NOT_FOUND,
    statusCode = StatusCode.NOT_FOUND
  ) {
    super(message, statusCode);
  }
}

class ForbiddenError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.FORBIDDEN,
    statusCode = StatusCode.FORBIDDEN
  ) {
    super(message, statusCode);
  }
}
class InternalServerError extends ErrorResponse {
  constructor(
    message = ReasonStatusCode.INTERNAL_SERVER_ERROR,
    statusCode = StatusCode.INTERNAL_SERVER_ERROR
  ) {
    super(message, statusCode);
  }
}

class InsufficientBalanceError extends ErrorResponse {
  constructor(
    message = "Insufficient balance to complete this transaction",
    statusCode = StatusCode.BAD_REQUEST
  ) {
    super(message, statusCode);
  }
}

class PaymentRequiredError extends ErrorResponse {
  constructor(
    message = "Payment is required to proceed",
    statusCode = StatusCode.PAYMENT_REQUIRED
  ) {
    super(message, statusCode);
  }
}

class ValidationError extends ErrorResponse {
  constructor(
    message = "Validation failed for the provided data",
    statusCode = StatusCode.BAD_REQUEST
  ) {
    super(message, statusCode);
  }
}

class TooManyRequestsError extends ErrorResponse {
  constructor(
    message = "Too many requests",
    statusCode = 429
  ) {
    super(message, statusCode);
  }
}

module.exports = {
  ConflictRequestError,
  BadRequestError,
  AuthFailureError,
  NotFoundError,
  ForbiddenError,
  InternalServerError,
  InsufficientBalanceError,
  PaymentRequiredError,
  ValidationError,
  TooManyRequestsError,
};
