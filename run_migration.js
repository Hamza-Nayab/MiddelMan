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

const statements = [
  "UPDATE users SET role = 'buyer' WHERE role::text = 'user'",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_changed_at TIMESTAMP WITH TIME ZONE",
  "CREATE TYPE user_role_new AS ENUM ('buyer', 'seller', 'admin')",
  "ALTER TABLE users ALTER COLUMN role DROP DEFAULT",
  "ALTER TABLE users ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new",
  "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'buyer'::user_role_new",
  "DROP TYPE user_role CASCADE",
  "ALTER TYPE user_role_new RENAME TO user_role",
  "CREATE TABLE IF NOT EXISTS profile_daily_stats (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, day DATE NOT NULL, views INTEGER NOT NULL DEFAULT 0, clicks INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), PRIMARY KEY (user_id, day))",
  "CREATE INDEX IF NOT EXISTS profile_daily_stats_user_day_idx ON profile_daily_stats (user_id, day)",
  "CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username))",
];

(async () => {
  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      try {
        console.log(`✓ Executing: ${stmt.substring(0, 60)}...`);
        await client.query(stmt);
      } catch (e) {
        if (
          e.message.includes("already exists") ||
          e.message.includes("does not exist")
        ) {
          console.log(`  (skipped: ${e.message})`);
        } else {
          throw e;
        }
      }
    }
    console.log("\n✅ Migration completed successfully!");
  } catch (e) {
    console.error("\n❌ Migration failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
