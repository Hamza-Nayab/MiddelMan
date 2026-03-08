import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { reviews } from "./reviews.schema";
import { users } from "./users.schema";

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

export type InsertReviewDispute = z.infer<typeof insertReviewDisputeSchema>;
export type ReviewDispute = typeof reviewDisputes.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
