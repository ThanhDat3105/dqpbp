const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    status: "error",
    code: 429,
    message: "Too many login attempts, please try again later.",
  },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 4000, // Limit each IP to 4000 requests per windowMs
  message: {
    status: "error",
    code: 429,
    message: "Too many requests from this IP, please try again later.",
  },
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  message: {
    status: "error",
    code: 429,
    message: "Too many admin requests, please try again later.",
  },
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    code: 429,
    message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
  },
});

module.exports = {
  authLimiter,
  globalLimiter,
  adminLimiter,
  registrationLimiter,
};
