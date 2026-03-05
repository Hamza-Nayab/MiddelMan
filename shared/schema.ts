import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["buyer", "seller", "admin"]);
export const verificationMethodEnum = pgEnum("verification_method", [
  "none",
  "ig_bio_code",
  "whatsapp_otp",
  "manual",
]);
export const themeEnum = pgEnum("profile_theme", ["light", "dark", "gradient"]);
export const adminActionEnum = pgEnum("admin_action", [
  "DISABLE_USER",
  "ENABLE_USER",
  "PROMOTE_ADMIN",
  "DEMOTE_ADMIN",
  "HIDE_REVIEW",
  "UNHIDE_REVIEW",
  "RESOLVE_DISPUTE",
  "DELETE_DISPUTE_EVIDENCE",
]);
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "resolved_valid",
  "resolved_rejected",
]);

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

export const profiles = pgTable("profiles", {
  userId: integer("user_id")
    .notNull()
    .unique()
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const profileDailyStats = pgTable(
  "profile_daily_stats",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: integer("views").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userDayPk: primaryKey({ columns: [table.userId, table.day] }),
    userDayIndex: index("profile_daily_stats_user_day_idx").on(
      table.userId,
      table.day,
    ),
  }),
);

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

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewerUserId: integer("reviewer_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    authorName: varchar("author_name", { length: 50 }).notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    isHidden: boolean("is_hidden").notNull().default(false),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    sellerCreatedIndex: index("reviews_seller_created_idx").on(
      table.sellerId,
      table.createdAt,
    ),
    // Performance index for filtering visible (non-hidden) reviews by seller
    // Used by GET /api/profile/:userId/reviews and search hydration
    sellerHiddenCreatedIndex: index("reviews_seller_hidden_created_idx").on(
      table.sellerId,
      table.isHidden,
      table.createdAt,
    ),
    reviewerCreatedIndex: index("reviews_reviewer_created_idx").on(
      table.reviewerUserId,
      table.createdAt,
    ),
    ipSellerCreatedIndex: index("reviews_ip_seller_created_idx").on(
      table.ipHash,
      table.sellerId,
      table.createdAt,
    ),
  }),
);
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: adminActionEnum("action").notNull(),
    targetUserId: integer("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetReviewId: integer("target_review_id").references(() => reviews.id, {
      onDelete: "set null",
    }),
    targetDisputeId: integer("target_dispute_id"),
    details: json("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    adminCreatedIndex: index("admin_audit_logs_admin_created_idx").on(
      table.adminId,
      table.createdAt,
    ),
  }),
);

export const reviewDisputes = pgTable(
  "review_disputes",
  {
    id: serial("id").primaryKey(),
    reviewId: integer("review_id")
      .notNull()
      .unique()
      .references(() => reviews.id, { onDelete: "cascade" }),
    sellerId: integer("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: disputeStatusEnum("status").notNull().default("open"),
    reason: varchar("reason").notNull(),
    message: text("message"),
    evidenceUrl: text("evidence_url"),
    evidenceMime: text("evidence_mime"),
    evidenceKey: text("evidence_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByAdminId: integer("resolved_by_admin_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    resolutionNote: text("resolution_note"),
    deletedEvidenceAt: timestamp("deleted_evidence_at", { withTimezone: true }),
  },
  (table) => ({
    statusCreatedIndex: index("review_disputes_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // 'dispute_resolved', 'review_hidden', etc.
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    relatedId: integer("related_id"), // e.g., disputeId, reviewId
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdCreatedIndex: index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    userIdReadIndex: index("notifications_user_read_idx").on(
      table.userId,
      table.isRead,
    ),
  }),
);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  googleId: true,
  role: true,
});

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
});

export const insertLinkSchema = createInsertSchema(links).pick({
  userId: true,
  icon: true,
  title: true,
  url: true,
  isActive: true,
  sortOrder: true,
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  sellerId: true,
  reviewerUserId: true,
  authorName: true,
  rating: true,
  comment: true,
  isHidden: true,
  ipHash: true,
  userAgentHash: true,
});

export const insertAdminAuditLogSchema = createInsertSchema(
  adminAuditLogs,
).pick({
  adminId: true,
  action: true,
  targetUserId: true,
  targetReviewId: true,
  targetDisputeId: true,
  details: true,
});

export const insertReviewDisputeSchema = createInsertSchema(
  reviewDisputes,
).pick({
  reviewId: true,
  sellerId: true,
  status: true,
  reason: true,
  message: true,
  evidenceUrl: true,
  evidenceMime: true,
  evidenceKey: true,
  resolvedByAdminId: true,
  resolutionNote: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  relatedId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type ProfileDailyStat = typeof profileDailyStats.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertReviewDispute = z.infer<typeof insertReviewDisputeSchema>;
export type ReviewDispute = typeof reviewDisputes.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
