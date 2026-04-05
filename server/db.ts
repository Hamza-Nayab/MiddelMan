import path from "path";
import { config } from "dotenv";
if (process.env.NODE_ENV !== "production") {
  config({ path: path.resolve(process.cwd(), ".env") });
}
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString,
  max: isProduction ? 20 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Prevent runaway queries from holding connections indefinitely
  statement_timeout: 30_000,
  // Neon and most cloud Postgres providers require SSL
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });
export { pool };
