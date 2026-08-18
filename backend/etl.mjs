import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  chunkAndStoreFile,
  ensureKnowledgeTable,
  DEFAULT_TABLE,
} = require("./src/utils/ai/chunk.js");
const { pingPostgres } = require("./src/config/db.js");
const {
  KNOWLEDGE_BASE_PATH,
  SUPPORTED_EXTENSIONS,
} = require("./src/config/knowledge-base.config.js");

const DEFAULT_INPUT_DIR = path.join(KNOWLEDGE_BASE_PATH, "faq");

function parseArgs(argv) {
  const files = [];
  let inputDir = process.env.ETL_INPUT_DIR || DEFAULT_INPUT_DIR;
  let table = process.env.KNOWLEDGE_CHUNKS_TABLE || DEFAULT_TABLE;

  for (const arg of argv) {
    if (arg.startsWith("--dir=")) {
      inputDir = arg.slice(6);
    } else if (arg.startsWith("--table=")) {
      table = arg.slice(8);
    } else if (arg.startsWith("--index=")) {
      table = arg.slice(8);
    } else if (!arg.startsWith("-")) {
      files.push(arg);
    }
  }

  return {
    files,
    inputDir: path.isAbsolute(inputDir)
      ? inputDir
      : path.resolve(process.cwd(), inputDir),
    table,
  };
}

async function collectSourceFiles(dir) {
  const results = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (
        SUPPORTED_EXTENSIONS.has(ext) &&
        entry.name.toLowerCase() !== "readme.md"
      ) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results.sort();
}

/**
 * Chunk one file and store embeddings in PostgreSQL (pgvector).
 * @param {string} filePath
 * @param {{ source?: string, table?: string, index?: string, replaceSource?: boolean, splitByDieu?: boolean, useSemantic?: boolean }} [options]
 */
async function etlFile(filePath, options = {}) {
  const absolutePath = path.resolve(filePath);
  const source =
    options.source ||
    path.relative(KNOWLEDGE_BASE_PATH, absolutePath).replace(/\\/g, "/");

  const result = await chunkAndStoreFile(absolutePath, {
    table: options.table || options.index,
    source,
    replaceSource: options.replaceSource !== false,
    splitByDieu: options.splitByDieu,
    useSemantic: options.useSemantic,
  });

  return { file: absolutePath, source, ...result };
}

/**
 * Run ETL over explicit files or every supported file under inputDir.
 * @param {{
 *   files?: string[],
 *   inputDir?: string,
 *   table?: string,
 *   index?: string,
 *   replaceSource?: boolean,
 *   splitByDieu?: boolean,
 *   useSemantic?: boolean,
 * }} [options]
 */
async function runEtl(options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for ETL embeddings");
  }

  await pingPostgres();

  const tableName = options.table || DEFAULT_TABLE;
  await ensureKnowledgeTable(tableName);

  let filePaths = (options.files || []).map((f) => path.resolve(f));

  if (!filePaths.length) {
    const inputDir = path.resolve(options.inputDir || DEFAULT_INPUT_DIR);
    try {
      await fs.access(inputDir);
    } catch {
      throw new Error(`Input directory not found: ${inputDir}`);
    }
    filePaths = await collectSourceFiles(inputDir);
  }

  if (!filePaths.length) {
    console.log("no files to process");
    return { results: [], totalChunks: 0, table: tableName };
  }

  const results = [];
  let totalChunks = 0;

  for (const filePath of filePaths) {
    console.log("processing:", filePath);
    const result = await etlFile(filePath, {
      table: tableName,
      replaceSource: options.replaceSource,
      splitByDieu: options.splitByDieu,
      useSemantic: options.useSemantic,
    });
    results.push(result);
    totalChunks += result.chunkCount;
    console.log(`  source: ${result.source}`);
    console.log(`  chunks: ${result.chunkCount}`);
  }

  console.log("---");
  console.log("files:", results.length);
  console.log("total chunks:", totalChunks);
  console.log("table:", tableName);

  return { results, totalChunks, table: tableName };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const { files, inputDir, table } = parseArgs(process.argv.slice(2));

  runEtl({ files, inputDir, table }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { etlFile, runEtl, collectSourceFiles };
