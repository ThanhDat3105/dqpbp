require("dotenv").config();

const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("dqpbp-prisma");

let client = null;

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT = "5432", DB_USER, DB_PASSWORD, DB_NAME } =
    process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error(
      "Missing database config: set DATABASE_URL or DB_HOST, DB_USER, DB_NAME",
    );
  }

  const auth = DB_PASSWORD
    ? `${DB_USER}:${encodeURIComponent(DB_PASSWORD)}`
    : DB_USER;

  return `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg(getDatabaseUrl()),
  });
}

function getPrismaClient() {
  if (!client) {
    client = createClient();
  }
  return client;
}

async function connectPrisma() {
  const prisma = getPrismaClient();
  await prisma.$connect();
  return prisma;
}

async function disconnectPrisma() {
  if (!client) return;
  await client.$disconnect();
  client = null;
}

module.exports = getPrismaClient;
module.exports.getPrismaClient = getPrismaClient;
module.exports.connectPrisma = connectPrisma;
module.exports.disconnectPrisma = disconnectPrisma;
