#!/usr/bin/env node
const { config } = require("dotenv");
const { Pool } = require("pg");

config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function explainSearchQuery() {
  const client = await pool.connect();
  try {
    console.log("🔍 Running EXPLAIN ANALYZE for /api/search query...\n");

    const query = `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT
        users.id,
        users.username,
        profiles.display_name,
        profiles.bio,
        profiles.avatar_url
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE
        users.role = 'seller'
        AND users.is_disabled = false
        AND lower(users.username) LIKE 'seller%'
      ORDER BY users.id
      LIMIT 15;
    `;

    const result = await client.query(query);
    
    console.log("📊 Query Plan:");
    console.log("═".repeat(80));
    result.rows.forEach(row => {
      console.log(row["QUERY PLAN"]);
    });
    console.log("═".repeat(80));

    const plan = result.rows.map(r => r["QUERY PLAN"]).join("\n");
    
    if (plan.includes("Index Scan")) {
      console.log("\n✅ Query uses Index Scan (GOOD)");
    } else if (plan.includes("Seq Scan")) {
      console.log("\n⚠️  Query uses Sequential Scan (NEEDS OPTIMIZATION)");
    }

    console.log("\n🔍 Running EXPLAIN ANALYZE for /api/search/suggest query...\n");

    const suggestQuery = `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT
        users.username,
        profiles.display_name
      FROM users
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE
        users.role = 'seller'
        AND users.is_disabled = false
        AND lower(users.username) LIKE 'seller%'
      ORDER BY users.id
      LIMIT 5;
    `;

    const suggestResult = await client.query(suggestQuery);
    
    console.log("📊 Suggest Query Plan:");
    console.log("═".repeat(80));
    suggestResult.rows.forEach(row => {
      console.log(row["QUERY PLAN"]);
    });
    console.log("═".repeat(80));

    const suggestPlan = suggestResult.rows.map(r => r["QUERY PLAN"]).join("\n");
    
    if (suggestPlan.includes("Index Scan")) {
      console.log("\n✅ Suggest query uses Index Scan (GOOD)");
    } else if (suggestPlan.includes("Seq Scan")) {
      console.log("\n⚠️  Suggest query uses Sequential Scan (NEEDS OPTIMIZATION)");
    }

  } finally {
    client.release();
    await pool.end();
  }
}

explainSearchQuery().catch(console.error);
