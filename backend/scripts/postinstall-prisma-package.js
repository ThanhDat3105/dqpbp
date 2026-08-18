/**
 * `dqpbp-prisma` là package anh em (file:../dqpbp-prisma), không phải folder con.
 * Node resolve require() theo realpath nên code trong dqpbp-prisma/dist/generated/runtime
 * chỉ tìm node_modules đi lên từ dqpbp-prisma/, không bao giờ thấy backend/node_modules.
 * => Phải cài dependencies ngay trong dqpbp-prisma/ (cần @prisma/client-runtime-utils).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const pkgDir = path.resolve(__dirname, "..", "..", "dqpbp-prisma");
const marker = path.join(pkgDir, "node_modules", "@prisma", "client-runtime-utils");

if (!fs.existsSync(path.join(pkgDir, "package.json"))) {
  console.log("[postinstall] Bo qua: khong thay ../dqpbp-prisma canh backend/");
  process.exit(0);
}

if (fs.existsSync(marker)) {
  console.log("[postinstall] dqpbp-prisma/node_modules da san sang, bo qua");
  process.exit(0);
}

// Loai bo env npm_config_* cua tien trinh npm dang chay, tranh nested npm bi
// ke thua local_prefix/prefix sai va cai nham vao backend/.
const env = {};
for (const [key, value] of Object.entries(process.env)) {
  if (!key.toLowerCase().startsWith("npm_config_")) env[key] = value;
}
if (process.env.NODE_ENV === "production") env.npm_config_omit = "dev";

console.log(`[postinstall] Cai dependencies cho ${pkgDir} ...`);
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(
  npmCmd,
  ["install", "--prefix", pkgDir, "--no-audit", "--no-fund"],
  { stdio: "inherit", env }
);

if (result.status !== 0) {
  console.error("[postinstall] Cai dependencies cho dqpbp-prisma that bai");
  process.exit(result.status === null ? 1 : result.status);
}
