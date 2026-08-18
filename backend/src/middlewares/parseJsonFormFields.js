const { Request, Response, NextFunction } = require("express");

/**
 * Middleware to parse JSON string form fields
 * This middleware will parse form fields that should be JSON objects/arrays
 * It's particularly useful when handling multipart/form-data requests with JSON values
 *
 * It can handle:
 * 1. Valid JSON strings (e.g., '["item1", "item2"]')
 * 2. Comma-separated values (e.g., 'item1,item2')
 * 3. Multiple JSON objects that should be in an array
 */
const parseJsonFormFields = (fields = [], forceArray = []) => {
  return (req, res, next) => {
    try {
      fields.forEach((field) => {
        const raw = req.body[field];
        if (!raw || typeof raw !== "string") return;

        try {
          // Thử parse JSON bình thường
          let parsed;

          try {
            parsed = JSON.parse(raw);
          } catch {
            // Nếu chuỗi dạng `{...},{...}` → wrap thành array
            const trimmed = raw.trim();
            if (trimmed.startsWith("{") && trimmed.includes("},{")) {
              parsed = JSON.parse(`[${trimmed}]`);
            } else {
              throw new Error("Invalid JSON format");
            }
          }

          console.log(`Parsed field "${field}":`, parsed);
          // Nếu field phải ép thành mảng
          if (
            forceArray.length > 0 &&
            forceArray.includes(field) &&
            !Array.isArray(parsed)
          ) {
            console.log(`Forcing field "${field}" to be an array`);
            parsed = [parsed];
          }

          console.log(`Final value for field "${field}":`, parsed);

          req.body[field] = parsed;
        } catch (e) {
          console.error(`Failed to parse field "${field}":`, e.message);
        }
      });

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = parseJsonFormFields;
