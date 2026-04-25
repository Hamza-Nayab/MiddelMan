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

const parsedUrl = new URL(connectionString);
const sslMode = parsedUrl.searchParams.get("sslmode");
const channelBinding = parsedUrl.searchParams.get("channel_binding");

parsedUrl.searchParams.delete("sslmode");
parsedUrl.searchParams.delete("channel_binding");

const normalizedConnectionString = parsedUrl.toString();
const shouldUseSsl =
  isProduction ||
  ["require", "verify-ca", "verify-full"].includes(sslMode ?? "") ||
  /\.neon\.tech$/i.test(parsedUrl.hostname) ||
  /\.aws\.neon\.tech$/i.test(parsedUrl.hostname);
const enableChannelBinding =
  channelBinding === "require" || channelBinding === "prefer";

const pool = new Pool({
  connectionString: normalizedConnectionString,
  max: isProduction ? 20 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Prevent runaway queries from holding connections indefinitely
  statement_timeout: 30_000,
  // Respect sslmode from the connection string and cloud-hosted Postgres defaults.
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  enableChannelBinding,
} as ConstructorParameters<typeof Pool>[0] & {
  enableChannelBinding?: boolean;
});

export const db = drizzle(pool, { schema });
export { pool };
