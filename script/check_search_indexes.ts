import { config } from "dotenv";
import pg from "pg";

config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkIndexes() {
  const client = await pool.connect();
  try {
    console.log("🔍 Checking database indexes for search optimization...\n");

    const indexQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('users', 'profiles')
      ORDER BY tablename, indexname;
    `;

    const result = await client.query(indexQuery);

    console.log("📊 Existing indexes:");
    console.log("═".repeat(80));

    result.rows.forEach((row) => {
      console.log(`\n📌 ${row.tablename}.${row.indexname}`);
      console.log(`   ${row.indexdef}`);
    });

    console.log("\n" + "═".repeat(80));
    console.log("\n✅ Checking for required search indexes:\n");

    const requiredIndexes = [
      { name: "users_username_lower_idx", exists: false },
      { name: "users_username_prefix_active_idx", exists: false },
      { name: "profiles_display_name_lower_idx", exists: false },
    ];

    result.rows.forEach((row) => {
      requiredIndexes.forEach((req) => {
        if (row.indexname === req.name) {
          req.exists = true;
        }
      });
    });

    requiredIndexes.forEach((idx) => {
      if (idx.exists) {
        console.log(`✅ ${idx.name} - EXISTS`);
      } else {
        console.log(`❌ ${idx.name} - MISSING`);
      }
    });

    console.log("\n" + "═".repeat(80));
    console.log("\n🔧 Creating missing indexes...\n");

    // Create missing indexes
    if (!requiredIndexes[0].exists) {
      console.log("Creating users_username_lower_idx...");
      await client.query(`
        CREATE INDEX IF NOT EXISTS users_username_lower_idx
        ON users (lower(username))
        WHERE username IS NOT NULL;
      `);
      console.log("✅ Created users_username_lower_idx");
    }

    if (!requiredIndexes[1].exists) {
      console.log("Creating users_username_prefix_active_idx...");
      await client.query(`
        CREATE INDEX IF NOT EXISTS users_username_prefix_active_idx
        ON users (lower(username) text_pattern_ops)
        WHERE role = 'seller' AND is_disabled = false;
      `);
      console.log("✅ Created users_username_prefix_active_idx");
    }

    if (!requiredIndexes[2].exists) {
      console.log("Creating profiles_display_name_lower_idx...");
      await client.query(`
        CREATE INDEX IF NOT EXISTS profiles_display_name_lower_idx
        ON profiles (lower(display_name))
        WHERE display_name IS NOT NULL;
      `);
      console.log("✅ Created profiles_display_name_lower_idx");
    }

    console.log("\n✅ All required indexes verified/created!");
  } finally {
    client.release();
    await pool.end();
  }
}

checkIndexes().catch(console.error);
