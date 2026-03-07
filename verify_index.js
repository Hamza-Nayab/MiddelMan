import "dotenv/config";
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

(async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_username_lower_idx'`,
    );

    if (result.rows.length > 0) {
      console.log("\n✅ Index verification PASSED");
      console.log(`   Index found: ${result.rows[0].indexname}`);
      console.log("\n   Used by:");
      console.log("   • GET /api/profile/:username");
      console.log("   • GET /api/profile/:username/bundle");
    } else {
      console.log("\n❌ Index verification FAILED - index not found");
    }
  } finally {
    client.release();
    await pool.end();
  }
})();
