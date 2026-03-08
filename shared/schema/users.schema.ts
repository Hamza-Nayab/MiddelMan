import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["buyer", "seller", "admin"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Username is nullable (buyers don't have usernames)
  // For sellers/admins: unique and used for login
  // Note: For case-insensitive lookups via lower(username), run this migration:
  //   CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users (lower(username)) WHERE username IS NOT NULL;
  // This index cannot be declared via Drizzle and must be applied via raw SQL.
  username: varchar("username", { length: 20 }).unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  role: userRoleEnum("role").notNull().default("buyer"),
  lastUsernameChangedAt: timestamp("last_username_changed_at", {
    withTimezone: true,
  }),
  usernameChangeCount: integer("username_change_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  // Admin moderation fields
  isDisabled: boolean("is_disabled").notNull().default(false),
  disabledReason: text("disabled_reason"),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  disabledByAdminId: integer("disabled_by_admin_id"), // FK to users.id (self-reference, defined in migration)
  isMasterAdmin: boolean("is_master_admin").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  googleId: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
