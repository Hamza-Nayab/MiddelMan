import type { Express } from "express";
import { and, desc, eq, gte, inArray, lt, sql } from "./_shared";
import {
  db,
  error,
  getSessionUser,
  hashValue,
  ok,
  profiles,
  refreshSellerReviewStatsCache,
  respondForbiddenFromAuthError,
  requireAuth,
  requireRole,
  reviewColumns,
  reviewCreateSchema,
  reviewUpdateSchema,
  reviewDisputes,
  reviews,
  sanitizeString,
  users,
} from "./_shared";

export function registerReviewsRoutes(app: Express): void {
  app.get("/api/profile/:userId/reviews", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 5;
    const limit = Math.min(Math.max(1, limitParam), 50);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    const ratingParam = (req.query.rating as string) || "all";
    const ratings =
      ratingParam === "all"
        ? [1, 2, 3, 4, 5]
        : ratingParam
            .split(",")
            .map((r) => parseInt(r, 10))
            .filter((r) => !isNaN(r) && r >= 1 && r <= 5);

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }
    if (req.query.cursor && Number.isNaN(cursor!)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );

    const whereConditions = [
      eq(reviews.sellerId, userId),
      eq(reviews.isHidden, false),
      inArray(reviews.rating, ratings),
    ];
    if (cursor !== undefined) {
      whereConditions.push(lt(reviews.id, cursor));
    }

    const [reviewList, statsRows] = await Promise.all([
      db
        .select(reviewColumns)
        .from(reviews)
        .where(and(...whereConditions))
        .orderBy(desc(reviews.createdAt), desc(reviews.id))
        .limit(limit + 1),
      db
        .select({
          rating: reviews.rating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(and(eq(reviews.sellerId, userId), eq(reviews.isHidden, false)))
        .groupBy(reviews.rating),
    ]);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      number,
      number
    >;
    let totalReviews = 0;
    let sumRating = 0;

    for (const row of statsRows) {
      breakdown[row.rating as keyof typeof breakdown] = Number(row.count);
      totalReviews += Number(row.count);
      sumRating += row.rating * Number(row.count);
    }

    const avgRating = totalReviews > 0 ? sumRating / totalReviews : 0;

    if (reviewList.length === 0 && totalReviews === 0) {
      const [seller] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, userId));

      if (!seller || seller.role !== "seller") {
        return res
          .status(404)
          .json(error("PROFILE_NOT_FOUND", "Profile not found"));
      }
    }

    let nextCursor: number | null = null;
    let paginatedReviews = reviewList;
    if (reviewList.length > limit) {
      paginatedReviews = reviewList.slice(0, limit);
      nextCursor = paginatedReviews[paginatedReviews.length - 1]?.id ?? null;
    }

    const response: any = {
      reviews: paginatedReviews,
      stats: {
        avgRating: Number(avgRating.toFixed(2)),
        totalReviews,
        breakdown,
      },
    };

    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  app.post("/api/profile/:userId/reviews", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "buyer");
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const parsed = reviewCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const sellerId = Number(req.params.userId);
    if (Number.isNaN(sellerId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const [seller] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, sellerId));

    if (!seller || seller.role !== "seller") {
      return res
        .status(404)
        .json(error("SELLER_NOT_FOUND", "Seller not found"));
    }

    const reviewer = await getSessionUser(req.session.userId);
    if (!reviewer || !reviewer.username) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Reviewer username is required"));
    }

    const salt = process.env.REVIEW_HASH_SALT;
    if (!salt) {
      return res
        .status(500)
        .json(error("SERVER_ERROR", "Review hashing salt not configured"));
    }

    const ip = req.ip || "";
    const ipHash = hashValue(`${ip}${salt}`);
    const userAgent = req.get("user-agent") || "";
    const userAgentHash = userAgent ? hashValue(userAgent) : null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [reviewCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reviews)
      .where(
        and(
          eq(reviews.sellerId, sellerId),
          eq(reviews.ipHash, ipHash),
          gte(reviews.createdAt, since),
        ),
      );

    if (Number(reviewCount?.count ?? 0) >= 3) {
      return res
        .status(429)
        .json(error("REVIEW_RATE_LIMITED", "Too many reviews from this IP"));
    }

    const [duplicate] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.sellerId, sellerId),
          eq(reviews.ipHash, ipHash),
          eq(reviews.comment, sanitizeString(parsed.data.comment)),
          gte(reviews.createdAt, since),
        ),
      );

    if (duplicate) {
      return res
        .status(429)
        .json(error("REVIEW_RATE_LIMITED", "Duplicate review detected"));
    }

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          eq(reviews.sellerId, sellerId),
          eq(reviews.reviewerUserId, reviewer.id),
        ),
      );

    if (existingReview) {
      return res
        .status(409)
        .json(
          error(
            "REVIEW_ALREADY_EXISTS",
            "You have already reviewed this seller",
          ),
        );
    }

    const [createdReview] = await db
      .insert(reviews)
      .values({
        sellerId,
        reviewerUserId: reviewer.id,
        authorName: reviewer.username,
        rating: parsed.data.rating,
        comment: sanitizeString(parsed.data.comment),
        ipHash,
        userAgentHash,
      })
      .returning();

    await refreshSellerReviewStatsCache(sellerId);

    return res.status(201).json(ok({ review: createdReview }));
  });

  app.get("/api/me/reviews", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const sellerId = req.session.userId!;
    const pageSize = 10;

    const offsetParam = req.query.offset ? Number(req.query.offset) : 0;
    if (
      req.query.offset &&
      (Number.isNaN(offsetParam) ||
        offsetParam < 0 ||
        !Number.isInteger(offsetParam))
    ) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid offset"));
    }
    const offset = Math.max(0, offsetParam);

    const reviewRows = await db
      .select({
        reviewId: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        reviewerName: sql<string>`coalesce(nullif(${profiles.displayName}, ''), nullif(${users.username}, ''), nullif(${reviews.authorName}, ''), 'Buyer')`,
        disputeStatus: reviewDisputes.status,
      })
      .from(reviews)
      .leftJoin(profiles, eq(profiles.userId, reviews.reviewerUserId))
      .leftJoin(users, eq(users.id, reviews.reviewerUserId))
      .leftJoin(reviewDisputes, eq(reviewDisputes.reviewId, reviews.id))
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(pageSize + 1)
      .offset(offset);

    const hasMore = reviewRows.length > pageSize;
    const reviewsPage = hasMore ? reviewRows.slice(0, pageSize) : reviewRows;

    const [profileStats] = await db
      .select({
        avgRating: profiles.avgRating,
        totalReviews: profiles.totalReviews,
      })
      .from(profiles)
      .where(eq(profiles.userId, sellerId));

    return res.status(200).json(
      ok({
        reviews: reviewsPage.map((row) => ({
          reviewId: row.reviewId,
          rating: row.rating,
          comment: row.comment,
          createdAt: row.createdAt,
          reviewerName: row.reviewerName || "Buyer",
          disputeStatus: row.disputeStatus || null,
        })),
        stats: {
          avgRating: Number(profileStats?.avgRating ?? 0),
          totalReviews: Number(profileStats?.totalReviews ?? 0),
        },
        meta: {
          hasMore,
          nextOffset: hasMore ? offset + pageSize : null,
        },
      }),
    );
  });

  app.get("/api/me/reviews/given", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "buyer");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const reviewerId = req.session.userId!;

    const results = await db
      .select({
        id: reviews.id,
        sellerId: reviews.sellerId,
        reviewerUserId: reviews.reviewerUserId,
        authorName: reviews.authorName,
        rating: reviews.rating,
        comment: reviews.comment,
        isHidden: reviews.isHidden,
        createdAt: reviews.createdAt,
        sellerUserId: users.id,
        sellerUsername: users.username,
        sellerDisplayName: profiles.displayName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.sellerId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(reviews.reviewerUserId, reviewerId))
      .orderBy(desc(reviews.createdAt));

    const formatted = results.map((row) => ({
      id: row.id,
      sellerId: row.sellerId,
      reviewerUserId: row.reviewerUserId,
      authorName: row.authorName,
      rating: row.rating,
      comment: row.comment,
      isHidden: row.isHidden,
      createdAt: row.createdAt,
      seller: {
        id: row.sellerUserId ?? row.sellerId,
        username: row.sellerUsername ?? null,
        displayName: row.sellerDisplayName ?? null,
      },
    }));

    return res.status(200).json(ok({ reviews: formatted }));
  });

  app.patch("/api/me/reviews/given/:id", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "buyer");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const reviewId = Number(req.params.id);
    if (Number.isNaN(reviewId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid review id"));
    }

    const parsed = reviewUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const reviewerId = req.session.userId!;

    const [existing] = await db
      .select({ id: reviews.id, sellerId: reviews.sellerId })
      .from(reviews)
      .where(
        and(eq(reviews.id, reviewId), eq(reviews.reviewerUserId, reviewerId)),
      );

    if (!existing) {
      return res
        .status(404)
        .json(error("REVIEW_NOT_FOUND", "Review not found"));
    }

    const [updated] = await db
      .update(reviews)
      .set({
        rating: parsed.data.rating,
        comment: sanitizeString(parsed.data.comment),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    await refreshSellerReviewStatsCache(existing.sellerId);

    return res.status(200).json(ok({ review: updated }));
  });
}
