"use strict";

const fs = require("fs/promises");
const path = require("path");
const { KNOWLEDGE_BASE_PATH } = require("../config/knowledge-base.config");
const { NotFoundError } = require("../core/error.response");

let cachedChunks = null;
let cachedChunksKey = null;

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectFiles(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    const isReadme = entry.name.toLowerCase() === "readme.md";

    if (!isReadme) {
      files.push(fullPath);
    }
  }

  return files;
}

async function loadKnowledgeBase() {
  if (!(await pathExists(KNOWLEDGE_BASE_PATH))) {
    throw new NotFoundError(
      `Knowledge base folder not found: ${KNOWLEDGE_BASE_PATH}`,
    );
  }

  const filePaths = await collectFiles(KNOWLEDGE_BASE_PATH);
  const relativeFiles = filePaths.map((p) =>
    path.relative(KNOWLEDGE_BASE_PATH, p),
  );

  if (!filePaths.length) {
    return { content: "", files: [], sources: [] };
  }

  const parts = await Promise.all(
    filePaths.sort().map(async (filePath) => {
      const relativePath = path.relative(KNOWLEDGE_BASE_PATH, filePath);
      const text = await fs.readFile(filePath, "utf8");
      return `--- ${relativePath} ---\n${text.trim()}`;
    }),
  );

  return {
    content: parts.join("\n\n"),
    files: relativeFiles,
    sources: relativeFiles.map((f) => ({ type: "file", path: f })),
  };
}

module.exports = {
  loadKnowledgeBase,
};
