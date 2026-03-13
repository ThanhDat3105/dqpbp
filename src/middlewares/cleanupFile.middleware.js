"use strict";

const fs = require("fs");

/**
 * Middleware to clean up uploaded files if an error occurs
 * This should be placed after routes and before the global error handler
 */
const cleanupFileOnError = (err, req, res, next) => {
  // Check if there are files in the request
  if (req.file) {
    cleanupFile(req.file.path);
  }

  if (req.files) {
    // req.files can be an array or an object depending on upload type
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

  // Pass the error to the next error handler
  next(err);
};

/**
 * Helper function to delete a file
 * @param {string} filePath
 */
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Cleanup] Deleted file due to error: ${filePath}`);
    }
  } catch (error) {
    console.error(`[Cleanup] Error deleting file ${filePath}:`, error.message);
  }
};

module.exports = {
  cleanupFileOnError,
  cleanupFile,
};
