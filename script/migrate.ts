import path from "path";
import { config } from "dotenv";
import { readdir, readFile } from "fs/promises";
import { Pool } from "pg";

config({ path: path.resolve(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const migrationsDir = path.resolve(process.cwd(), "migrations");
const isProduction = process.env.NODE_ENV === "production";

const splitStatements = (sqlText: string) =>
  sqlText
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

async function main() {
  const pool = new Pool({
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const appliedRows = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations",
    );
    const applied = new Set(appliedRows.rows.map((row) => row.name));

    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sqlText = await readFile(fullPath, "utf8");
      const statements = splitStatements(sqlText);

      console.log(`Applying ${file}...`);
      await client.query("BEGIN");
      try {
        for (const statement of statements) {
          await client.query(statement);
        }
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
          [file],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations are up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Migration runner failed",
  );
  process.exit(1);
});
