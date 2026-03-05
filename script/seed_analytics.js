import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const userId = 19;
const sql = `INSERT INTO profile_daily_stats (user_id, day, views, clicks, updated_at)
SELECT ${userId}, d::date,
       (120 + (random() * 260)::int) AS views,
       (40 + (random() * 140)::int) AS clicks,
       now()
FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') d
ON CONFLICT (user_id, day)
DO UPDATE SET
  views = EXCLUDED.views,
  clicks = EXCLUDED.clicks,
  updated_at = now();`;

const client = await pool.connect();
try {
  await client.query(sql);
  console.log(`Inserted mock analytics for seller4 (user_id=${userId})`);
} finally {
  client.release();
  await pool.end();
}
