import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Starting migration...");

    // Read and execute the migration SQL
    const migrationSql = readFileSync(
      resolve("./migrations/0003_rename_instagram_to_email.sql"),
      "utf-8",
    );

    // Execute the migration
    await client.query(migrationSql);

    console.log("✓ Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

runMigration();
