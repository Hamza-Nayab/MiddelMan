import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file
const envContent = readFileSync(resolve(".env"), "utf8");
const envLines = envContent.split("\n");
for (const line of envLines) {
  const [key, ...valueParts] = line.split("=");
  const value = valueParts.join("=");
  if (key && value && !process.env[key]) {
    process.env[key] = value;
  }
}

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = readFileSync(resolve("migrations/0002_notifications.sql"), "utf8");

(async () => {
  const client = await pool.connect();
  try {
    console.log("Executing notifications migration...");
    await client.query(sql);
    console.log("✅ Notifications table created successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
