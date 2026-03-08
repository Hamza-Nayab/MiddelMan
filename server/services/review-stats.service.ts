import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { profiles, reviews } from "@shared/schema";

export async function getReviewStats(sellerId: number, includeHidden = false) {
  const whereClause = includeHidden
    ? eq(reviews.sellerId, sellerId)
    : and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false));

  const [stats] = await db
    .select({
      avgRating: sql<number>`avg(${reviews.rating})`,
      totalReviews: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(whereClause);

  return {
    avgRating: Number(stats?.avgRating ?? 0),
    totalReviews: Number(stats?.totalReviews ?? 0),
  };
}

export async function refreshSellerReviewStatsCache(sellerId: number) {
  const [stats] = await db
    .select({
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      totalReviews: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)));

  await db
    .update(profiles)
    .set({
      avgRating: Math.round(Number(stats?.avgRating ?? 0)),
      totalReviews: Number(stats?.totalReviews ?? 0),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, sellerId));
}
