const { cleanupFile } = require("./cleanupFile.middleware");

const tryParseJSON = (value) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const validate = (schema) => (req, res, next) => {
  const options = {
    abortEarly: false,
    errors: { label: "key" },
    allowUnknown: true,
  };

  // 🔥 AUTO PARSE BODY (fix assignees lỗi)
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      req.body[key] = tryParseJSON(req.body[key]);
    });
  }

  const validateField = (field, data) => {
    if (!schema[field]) return { value: data };
    return schema[field].validate(data, options);
  };

  const queryValidation = validateField("query", req.query);
  const bodyValidation = validateField("body", req.body);
  const paramsValidation = validateField("params", req.params);

  const allErrors = [
    queryValidation.error,
    bodyValidation.error,
    paramsValidation.error,
  ].filter(Boolean);

  if (allErrors.length > 0) {
    const files = [];

    if (req.file) files.push(req.file);

    if (req.files) {
      if (Array.isArray(req.files)) {
        files.push(...req.files);
      } else {
        Object.values(req.files).forEach((arr) => {
          if (Array.isArray(arr)) files.push(...arr);
        });
      }
    }

    files.forEach((file) => cleanupFile(file.path));

    const errorMessage = allErrors
      .flatMap((err) => err.details)
      .map((detail) => detail.message)
      .join(", ");

    return res.status(400).json({
      status: false,
      message: errorMessage,
    });
  }

  if (queryValidation.value) req.query = queryValidation.value;
  if (bodyValidation.value) req.body = bodyValidation.value;
  if (paramsValidation.value) req.params = paramsValidation.value;

  next();
};

module.exports = validate;
