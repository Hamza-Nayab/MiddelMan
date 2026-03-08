import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users.schema";

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

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
