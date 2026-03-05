import "dotenv/config";
import { Client } from "pg";

async function main() {
  const q = (process.argv[2] || "se").trim().toLowerCase();
  if (q.length < 2) {
    throw new Error("Query must be at least 2 characters");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString });
  await client.connect();

  const pattern = `%${q}%`;
  const usernamePrefix = `${q}%`;

  const explainSql = `
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  u.id,
  u.username,
  p.display_name,
  p.bio,
  p.avatar_url
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE
  u.role = 'seller'
  AND u.is_disabled = false
  AND (
    lower(u.username) LIKE $1
    OR p.display_name ILIKE $2
    OR p.contact_email ILIKE $2
  )
ORDER BY u.id ASC
LIMIT 16 OFFSET 0;
`;

  const suggestExplainSql = `
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.username
FROM users u
WHERE
  u.role = 'seller'
  AND u.is_disabled = false
  AND lower(u.username) LIKE $1
ORDER BY u.username
LIMIT 5;
`;

  const explain = await client.query(explainSql, [usernamePrefix, pattern]);
  const suggestExplain = await client.query(suggestExplainSql, [usernamePrefix]);
  await client.query("SET enable_seqscan = off");
  const suggestForced = await client.query(suggestExplainSql, [usernamePrefix]);

  console.log("EXPLAIN ANALYZE plan (main search):");
  for (const row of explain.rows) {
    const line = row["QUERY PLAN"];
    if (typeof line === "string") {
      console.log(line);
    }
  }

  console.log("\nEXPLAIN ANALYZE plan (suggest search):");
  for (const row of suggestExplain.rows) {
    const line = row["QUERY PLAN"];
    if (typeof line === "string") {
      console.log(line);
    }
  }

  console.log("\nEXPLAIN ANALYZE plan (suggest search, seqscan off):");
  for (const row of suggestForced.rows) {
    const line = row["QUERY PLAN"];
    if (typeof line === "string") {
      console.log(line);
    }
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
