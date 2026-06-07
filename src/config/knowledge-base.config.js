"use strict";

const path = require("path");

const KNOWLEDGE_BASE_DIR = process.env.KNOWLEDGE_BASE_DIR || "knowledge-base";

const KNOWLEDGE_BASE_PATH = path.isAbsolute(KNOWLEDGE_BASE_DIR)
  ? KNOWLEDGE_BASE_DIR
  : path.resolve(process.cwd(), KNOWLEDGE_BASE_DIR);

const SUPPORTED_EXTENSIONS = new Set([".md", ".txt"]);

module.exports = {
  KNOWLEDGE_BASE_DIR,
  KNOWLEDGE_BASE_PATH,
  SUPPORTED_EXTENSIONS,
};
