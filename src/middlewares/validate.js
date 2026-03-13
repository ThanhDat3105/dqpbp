const Joi = require("joi");
const pick = require("../utils/pick");

const { cleanupFile } = require("./cleanupFile.middleware");

const validate = (schema) => (req, res, next) => {
  const validSchema = pick(schema, ["params", "query", "body"]);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: "key" }, abortEarly: false })
    .validate(object);

  if (error) {
    // Cleanup files if validation fails
    if (req.file) cleanupFile(req.file.path);
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => cleanupFile(file.path));
      } else {
        Object.values(req.files).forEach((fileArray) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file) => cleanupFile(file.path));
          }
        });
      }
    }

    const errorMessage = error.details
      .map((details) => details.message)
      .join(", ");
    return res.status(400).json({ status: false, message: errorMessage }); //next(new ApiError(httpStatus.OK, errorMessage));
  }
  Object.assign(req, value);
  return next();
};

module.exports = validate;
