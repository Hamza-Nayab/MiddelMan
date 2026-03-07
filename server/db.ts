import path from "path";
import { config } from "dotenv";
import { existsSync } from "fs";
const envPath = [".env", "../.env"].map((p) => path.resolve(process.cwd(), p)).find(existsSync);
if (envPath) config({ path: envPath });
else config();
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
