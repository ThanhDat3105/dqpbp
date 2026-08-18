#!/usr/bin/env node
"use strict";

const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const slugify = require("slugify");

const BACKEND_ROOT = path.resolve(__dirname, "..");
const DEFAULT_INPUT = path.join(BACKEND_ROOT, "knowledge-base", "faq_pdf");
const DEFAULT_OUTPUT = path.join(BACKEND_ROOT, "knowledge-base", "faq");

const slugifyOptions = {
  lower: true,
  strict: true,
  locale: "vi",
};

function parseArgs(argv) {
  const options = {
    inputDir: DEFAULT_INPUT,
    outputDir: DEFAULT_OUTPUT,
    file: null,
    force: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input" && argv[i + 1]) {
      options.inputDir = path.resolve(argv[++i]);
    } else if (arg === "--output" && argv[i + 1]) {
      options.outputDir = path.resolve(argv[++i]);
    } else if (arg === "--file" && argv[i + 1]) {
      options.file = argv[++i];
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node tool/pdf_to_markdown.js [options]

Convert PDF files from faq_pdf to Markdown in faq (for knowledge-base chatbot).

Options:
  --input <dir>   Input directory (default: knowledge-base/faq_pdf)
  --output <dir>  Output directory (default: knowledge-base/faq)
  --file <name>   Convert a single PDF file (basename or full path)
  --force         Overwrite existing .md files
  -h, --help      Show this help
`);
}

function toOutputName(pdfFileName) {
  const base = path.basename(pdfFileName, path.extname(pdfFileName));
  const slug = slugify(base, slugifyOptions).replace(/-/g, "_");
  return `${slug || "document"}.md`;
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function formatMarkdown(text, meta) {
  const body = cleanText(text);
  const frontmatter = [
    "---",
    `source: ${meta.source}`,
    `title: ${meta.title}`,
    `pages: ${meta.pages}`,
    `converted_at: ${meta.convertedAt}`,
    "---",
    "",
  ].join("\n");

  return `${frontmatter}${body}\n`;
}

async function extractPdfText(filePath) {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return {
      text: result.text || "",
      pages: result.total || result.pages?.length || 0,
    };
  } finally {
    await parser.destroy();
  }
}

async function listPdfFiles(inputDir, singleFile) {
  if (singleFile) {
    const resolved = path.isAbsolute(singleFile)
      ? singleFile
      : path.join(inputDir, singleFile);
    return [resolved];
  }

  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"),
    )
    .map((entry) => path.join(inputDir, entry.name))
    .sort();
}

async function convertPdf(pdfPath, outputDir, { force }) {
  const sourceName = path.basename(pdfPath);
  const title = path.basename(pdfPath, path.extname(pdfPath));
  const outputName = toOutputName(sourceName);
  const outputPath = path.join(outputDir, outputName);

  if (!force) {
    try {
      await fs.access(outputPath);
      return {
        sourceName,
        outputName,
        status: "skipped",
        reason: "already exists",
      };
    } catch {
      // file does not exist — proceed
    }
  }

  const { text, pages } = await extractPdfText(pdfPath);

  if (!text.trim()) {
    return {
      sourceName,
      outputName,
      status: "failed",
      reason: "no text extracted",
    };
  }

  const markdown = formatMarkdown(text, {
    source: sourceName,
    title,
    pages,
    convertedAt: new Date().toISOString(),
  });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, markdown, "utf8");

  return {
    sourceName,
    outputName,
    outputPath,
    pages,
    chars: markdown.length,
    status: "ok",
  };
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  const pdfFiles = await listPdfFiles(options.inputDir, options.file);

  if (!pdfFiles.length) {
    console.error(`No PDF files found in ${options.inputDir}`);
    process.exit(1);
  }

  console.log(`Input : ${options.inputDir}`);
  console.log(`Output: ${options.outputDir}`);
  console.log(`Files : ${pdfFiles.length}\n`);

  const results = [];

  for (const pdfPath of pdfFiles) {
    try {
      const result = await convertPdf(pdfPath, options.outputDir, options);
      results.push(result);

      if (result.status === "ok") {
        console.log(
          `✓ ${result.sourceName} → ${result.outputName} (${result.pages} pages, ${result.chars} chars)`,
        );
      } else if (result.status === "skipped") {
        console.log(`- ${result.sourceName} → skipped (${result.reason})`);
      } else {
        console.log(`✗ ${result.sourceName} → failed (${result.reason})`);
      }
    } catch (error) {
      console.error(`✗ ${path.basename(pdfPath)} → ${error.message}`);
      results.push({
        sourceName: path.basename(pdfPath),
        status: "failed",
        reason: error.message,
      });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`\nDone: ${ok} converted, ${skipped} skipped, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
