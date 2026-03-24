import type { Express } from "express";
import bcrypt from "bcryptjs";
import { and, desc, eq, gte, ilike, or, sql } from "./_shared";
import {
  adminCreateAdminSchema,
  adminDisableUserSchema,
  adminRoleSchema,
  db,
  error,
  linkColumns,
  links,
  logAdminAction,
  ok,
  profileColumns,
  profiles,
  refreshSellerReviewStatsCache,
  requireAdmin,
  requireMasterAdmin,
  respondForbiddenFromAuthError,
  reviewDisputes,
  reviewHideSchema,
  reviews,
  users,
} from "./_shared";

export function registerAdminRoutes(app: Express): void {
  app.get("/api/admin/users", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    if (req.query.cursor && (Number.isNaN(cursor) || cursor === undefined)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    const q = (req.query.q as string) || "";
    const role = (req.query.role as string) || "";
    const disabledParam = (req.query.disabled as string) || "";

    const disabled =
      disabledParam === ""
        ? undefined
        : disabledParam.toLowerCase() === "true"
          ? true
          : disabledParam.toLowerCase() === "false"
            ? false
            : undefined;

    if (
      disabledParam &&
      (disabled === undefined || (typeof disabled !== "boolean" && disabled))
    ) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid disabled filter"));
    }

    const filters: any[] = [];

    if (disabled !== undefined) {
      filters.push(eq(users.isDisabled, disabled));
    }

    if (role) {
      if (!["buyer", "seller", "admin"].includes(role)) {
        return res.status(400).json(error("VALIDATION_ERROR", "Invalid role"));
      }
      filters.push(eq(users.role, role as any));
    }

    if (q) {
      const numericId = Number(q);
      if (!Number.isNaN(numericId)) {
        filters.push(eq(users.id, numericId));
      } else {
        filters.push(
          or(ilike(users.email, `%${q}%`), ilike(users.username, `%${q}%`)),
        );
      }
    }

    if (cursor !== undefined) {
      filters.push(gte(users.id, cursor + 1));
    }

    const items = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isDisabled: users.isDisabled,
        disabledReason: users.disabledReason,
        createdAt: users.createdAt,
        isMasterAdmin: users.isMasterAdmin,
      })
      .from(users)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(users.id)
      .limit(limit + 1);

    let nextCursor: number | undefined = undefined;
    let resultItems = items;

    if (items.length > limit) {
      resultItems = items.slice(0, limit);
      nextCursor = items[limit]!.id;
    }

    return res
      .status(200)
      .json(ok({ items: resultItems, nextCursor: nextCursor || null }));
  });

  app.get("/api/admin/reviews", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    if (req.query.cursor && Number.isNaN(cursor!)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    const sellerId = req.query.sellerId
      ? Number(req.query.sellerId)
      : undefined;
    if (req.query.sellerId && Number.isNaN(sellerId!)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid seller id"));
    }

    const rating = req.query.rating ? Number(req.query.rating) : undefined;
    if (
      req.query.rating &&
      (Number.isNaN(rating!) || rating! < 1 || rating! > 5)
    ) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid rating (1-5)"));
    }

    const hiddenParam =
      typeof req.query.hidden === "string" ? req.query.hidden : undefined;
    const hiddenFilter =
      hiddenParam === undefined
        ? undefined
        : hiddenParam.toLowerCase() === "true"
          ? true
          : hiddenParam.toLowerCase() === "false"
            ? false
            : undefined;

    if (hiddenParam && hiddenFilter === undefined) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid hidden filter"));
    }

    const conditions = [] as Array<ReturnType<typeof eq | typeof gte>>;
    if (sellerId !== undefined) {
      conditions.push(eq(reviews.sellerId, sellerId));
    }
    if (hiddenFilter !== undefined) {
      conditions.push(eq(reviews.isHidden, hiddenFilter));
    }
    if (rating !== undefined) {
      conditions.push(eq(reviews.rating, rating));
    }
    if (cursor !== undefined) {
      conditions.push(gte(reviews.id, cursor + 1));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...(conditions as any[]));

    const reviewList = await db
      .select({
        id: reviews.id,
        sellerId: reviews.sellerId,
        reviewerUserId: reviews.reviewerUserId,
        authorName: reviews.authorName,
        rating: reviews.rating,
        comment: reviews.comment,
        isHidden: reviews.isHidden,
        createdAt: reviews.createdAt,
        sellerUsername: users.username,
        sellerDisplayName: profiles.displayName,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.sellerId, users.id))
      .leftJoin(profiles, eq(profiles.userId, reviews.sellerId))
      .where(whereClause)
      .orderBy(reviews.id)
      .limit(limit + 1);

    let nextCursor: number | null = null;
    let paginatedReviews = reviewList;
    if (reviewList.length > limit) {
      paginatedReviews = reviewList.slice(0, limit);
      nextCursor = paginatedReviews[paginatedReviews.length - 1]?.id ?? null;
    }

    const response: any = { items: paginatedReviews };
    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  app.patch("/api/admin/reviews/:id/hide", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const reviewId = Number(req.params.id);
    if (Number.isNaN(reviewId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid review id"));
    }

    const parsed = reviewHideSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const [updated] = await db
      .update(reviews)
      .set({ isHidden: parsed.data.isHidden })
      .where(eq(reviews.id, reviewId))
      .returning();

    if (!updated) {
      return res
        .status(404)
        .json(error("REVIEW_NOT_FOUND", "Review not found"));
    }

    const actionType = parsed.data.isHidden ? "HIDE_REVIEW" : "UNHIDE_REVIEW";
    await logAdminAction(req.session.userId!, actionType, undefined, {
      targetReviewId: reviewId,
      sellerId: updated.sellerId,
      reason: parsed.data.reason,
    });

    await refreshSellerReviewStatsCache(updated.sellerId);

    return res.status(200).json(ok({ review: updated }));
  });

  app.patch("/api/admin/users/:id/disable", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const parsed = adminDisableUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const [updated] = await db
      .update(users)
      .set({
        isDisabled: true,
        disabledReason: parsed.data.reason || null,
        disabledAt: new Date(),
        disabledByAdminId: req.session.userId!,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    await logAdminAction(req.session.userId!, "DISABLE_USER", userId, {
      reason: parsed.data.reason,
    });

    return res.status(200).json(
      ok({
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          isDisabled: updated.isDisabled,
          disabledReason: updated.disabledReason,
        },
      }),
    );
  });

  app.patch("/api/admin/users/:id/enable", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const [updated] = await db
      .update(users)
      .set({
        isDisabled: false,
        disabledReason: null,
        disabledAt: null,
        disabledByAdminId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    await logAdminAction(req.session.userId!, "ENABLE_USER", userId);

    return res.status(200).json(
      ok({
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          isDisabled: updated.isDisabled,
        },
      }),
    );
  });

  app.patch("/api/admin/users/:id/role", async (req, res) => {
    try {
      await requireMasterAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const parsed = adminRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const [updated] = await db
      .update(users)
      .set({
        role: parsed.data.role,
        isMasterAdmin:
          parsed.data.role === "admin" ? false : users.isMasterAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    const actionType =
      parsed.data.role === "admin" ? "PROMOTE_ADMIN" : "DEMOTE_ADMIN";
    await logAdminAction(req.session.userId!, actionType, userId, {
      newRole: parsed.data.role,
    });

    return res.status(200).json(
      ok({
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          isMasterAdmin: updated.isMasterAdmin,
          createdAt: updated.createdAt,
        },
      }),
    );
  });

  app.get("/api/admin/sellers/:sellerId", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const sellerId = Number(req.params.sellerId);
    if (Number.isNaN(sellerId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid seller id"));
    }

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isDisabled: users.isDisabled,
        disabledReason: users.disabledReason,
        createdAt: users.createdAt,
        isMasterAdmin: users.isMasterAdmin,
      })
      .from(users)
      .where(eq(users.id, sellerId));

    if (!user) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    const [profile] = await db
      .select(profileColumns)
      .from(profiles)
      .where(eq(profiles.userId, sellerId));

    const userLinks = await db
      .select(linkColumns)
      .from(links)
      .where(eq(links.userId, sellerId))
      .orderBy(links.sortOrder);

    const [sellerStats] = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating})::numeric, 0)`,
        totalReviews: sql<number>`COUNT(${reviews.id})`,
      })
      .from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)));

    const reviewsReceived = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        authorName: reviews.authorName,
        isHidden: reviews.isHidden,
        createdAt: reviews.createdAt,
        reviewerUserId: reviews.reviewerUserId,
      })
      .from(reviews)
      .where(eq(reviews.sellerId, sellerId))
      .orderBy(desc(reviews.createdAt))
      .limit(20);

    const reviewsGiven = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        authorName: reviews.authorName,
        isHidden: reviews.isHidden,
        createdAt: reviews.createdAt,
        sellerId: reviews.sellerId,
      })
      .from(reviews)
      .where(eq(reviews.reviewerUserId, sellerId))
      .orderBy(desc(reviews.createdAt))
      .limit(20);

    const recentDisputes = await db
      .select({
        id: reviewDisputes.id,
        reviewId: reviewDisputes.reviewId,
        status: reviewDisputes.status,
        reason: reviewDisputes.reason,
        message: reviewDisputes.message,
        evidenceUrl: reviewDisputes.evidenceUrl,
        createdAt: reviewDisputes.createdAt,
        resolvedAt: reviewDisputes.resolvedAt,
        resolutionNote: reviewDisputes.resolutionNote,
      })
      .from(reviewDisputes)
      .where(eq(reviewDisputes.sellerId, sellerId))
      .orderBy(desc(reviewDisputes.createdAt))
      .limit(20);

    return res.status(200).json(
      ok({
        user,
        profile,
        links: userLinks,
        stats: {
          avgRating: Number(sellerStats?.avgRating ?? 0),
          totalReviews: Number(sellerStats?.totalReviews ?? 0),
        },
        reviewsReceived,
        reviewsGiven,
        recentDisputes,
      }),
    );
  });

  app.get("/api/admin/admins", async (req, res) => {
    try {
      await requireMasterAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const admins = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isMasterAdmin: users.isMasterAdmin,
        isDisabled: users.isDisabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.createdAt));

    return res.status(200).json(ok({ admins }));
  });

  app.post("/api/admin/admins", async (req, res) => {
    try {
      await requireMasterAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const parsed = adminCreateAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const existingUser = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(
        or(
          eq(users.email, parsed.data.email),
          eq(users.username, parsed.data.username),
        ),
      )
      .limit(1);

    if (existingUser.length > 0) {
      return res
        .status(409)
        .json(
          error(
            "USER_EXISTS",
            existingUser[0].email === parsed.data.email
              ? "Email already registered"
              : "Username already registered",
          ),
        );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const [newAdmin] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash,
        role: "admin",
        isMasterAdmin: false,
      })
      .returning();

    await db.insert(profiles).values({
      userId: newAdmin.id,
      displayName: parsed.data.displayName || parsed.data.username,
    });

    await logAdminAction(req.session.userId!, "PROMOTE_ADMIN", newAdmin.id, {
      email: parsed.data.email,
      username: parsed.data.username,
    });

    return res.status(201).json(
      ok({
        admin: {
          id: newAdmin.id,
          username: newAdmin.username,
          email: newAdmin.email,
          role: newAdmin.role,
          isMasterAdmin: newAdmin.isMasterAdmin,
          createdAt: newAdmin.createdAt,
        },
      }),
    );
  });
}
