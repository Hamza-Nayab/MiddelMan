#!/usr/bin/env node
const { config } = require("dotenv");
const { Pool } = require("pg");

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkIndexes() {
  const client = await pool.connect();
  try {
    console.log("🔍 Checking database indexes...\n");

    const result = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('users', 'profiles')
      ORDER BY indexname;
    `);

    const existing = result.rows.map((r) => r.indexname);

    const required = {
      users_username_lower_idx: !existing.includes("users_username_lower_idx"),
      users_username_prefix_active_idx: !existing.includes(
        "users_username_prefix_active_idx",
      ),
      profiles_display_name_lower_idx: !existing.includes(
        "profiles_display_name_lower_idx",
      ),
    };

    for (const [name, missing] of Object.entries(required)) {
      if (missing) {
        console.log(`❌ ${name} - MISSING`);
      } else {
        console.log(`✅ ${name} - EXISTS`);
      }
    }

    // Create missing indexes
    if (required["users_username_lower_idx"]) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS users_username_lower_idx
        ON users (lower(username))
        WHERE username IS NOT NULL;
      `);
      console.log("\n✅ Created users_username_lower_idx");
    }

    if (required["users_username_prefix_active_idx"]) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS users_username_prefix_active_idx
        ON users (lower(username) text_pattern_ops)
        WHERE role = 'seller' AND is_disabled = false;
      `);
      console.log("✅ Created users_username_prefix_active_idx");
    }

    if (required["profiles_display_name_lower_idx"]) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS profiles_display_name_lower_idx
        ON profiles (lower(display_name))
        WHERE display_name IS NOT NULL;
      `);
      console.log("✅ Created profiles_display_name_lower_idx");
    }

    console.log("\n✅ Index verification complete");
  } finally {
    client.release();
    await pool.end();
  }
}

checkIndexes().catch(console.error);
