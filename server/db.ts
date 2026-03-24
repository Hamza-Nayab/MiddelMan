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

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export { pool };
