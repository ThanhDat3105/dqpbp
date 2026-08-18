// migration.js

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function run() {
  const databaseUrl =
    process.env.DATABASE_URL || "postgresql://dqpbp:dqpbp@localhost:5432/dqpbp";

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  const migrationDir = path.join(__dirname, "./migrations");

  const files = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`Running ${file}...`);

    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");

    try {
      await client.query(sql);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ Failed: ${file}`);
      console.error(err.message);
      process.exit(1);
    }
  }

  await client.end();

  console.log("All migrations completed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
