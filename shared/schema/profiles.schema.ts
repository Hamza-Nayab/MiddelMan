import { sql } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users.schema";

export const verificationMethodEnum = pgEnum("verification_method", [
  "none",
  "ig_bio_code",
  "whatsapp_otp",
  "manual",
]);

export const themeEnum = pgEnum("profile_theme", ["light", "dark", "gradient"]);

export const profiles = pgTable("profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  bio: varchar("bio", { length: 160 }),
  avatarUrl: text("avatar_url"),
  contactEmail: varchar("contact_email", { length: 254 }).unique(),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  countryCode: varchar("country_code", { length: 2 }).default("US"),
  isVerified: boolean("is_verified").notNull().default(false),
  verificationMethod: verificationMethodEnum("verification_method")
    .notNull()
    .default("none"),
  theme: themeEnum("theme").notNull().default("light"),
  backgroundPreset: varchar("background_preset", { length: 20 }),
  gradientPreset: varchar("gradient_preset", { length: 20 }),
  accentColor: varchar("accent_color", { length: 7 }),
  avgRating: integer("avg_rating").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const links = pgTable(
  "links",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    icon: varchar("icon", { length: 30 }),
    title: varchar("title", { length: 40 }).notNull(),
    url: text("url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    // Performance index for retrieving active links by user and sort order
    // Used by GET /api/profile/:userId/links
    userActiveSortIndex: index("links_user_active_sort_idx").on(
      table.userId,
      table.isActive,
      table.sortOrder,
    ),
  }),
);

export const insertProfileSchema = createInsertSchema(profiles).pick({
  userId: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  contactEmail: true,
  whatsappNumber: true,
  phoneNumber: true,
  countryCode: true,
  isVerified: true,
  verificationMethod: true,
  theme: true,
  backgroundPreset: true,
  gradientPreset: true,
  accentColor: true,
});

export const insertLinkSchema = createInsertSchema(links).pick({
  userId: true,
  icon: true,
  title: true,
  url: true,
  isActive: true,
  sortOrder: true,
});

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;
