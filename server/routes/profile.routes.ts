import type { Express } from "express";
import { and, desc, eq, ne, sql } from "./_shared";
import {
  checkRateLimit,
  db,
  error,
  getClientKey,
  getReviewStats,
  linkColumns,
  links,
  ok,
  profileColumns,
  profileUpdateSchema,
  profiles,
  recordDailyStat,
  requireAuth,
  requireRole,
  reviewColumns,
  reviews,
  sanitizeString,
  userColumns,
  users,
} from "./_shared";

export function registerProfileRoutes(app: Express): void {
  app.get("/api/profile/:username", async (req, res) => {
    const username = sanitizeString(req.params.username || "");
    if (!username) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Username is required"));
    }

    const [user] = await db
      .select(userColumns)
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);

    if (!user) {
      return res
        .status(404)
        .json(error("PROFILE_NOT_FOUND", "Profile not found"));
    }

    if (user.isDisabled) {
      return res
        .status(403)
        .json(error("SELLER_UNAVAILABLE", "Seller unavailable"));
    }

    let [profile] = await db
      .select(profileColumns)
      .from(profiles)
      .where(eq(profiles.userId, user.id));

    if (!profile) {
      const [createdProfile] = await db
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: user.username || "Seller",
        })
        .returning();
      profile = createdProfile;
    }

    const stats = await getReviewStats(user.id);

    const shouldTrack = req.query.track === "1";
    if (shouldTrack) {
      try {
        await recordDailyStat(user.id, "views");
      } catch {}
    }

    return res.status(200).json(
      ok({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
        profile,
        stats,
      }),
    );
  });

  app.get("/api/profile/:username/bundle", async (req, res) => {
    const username = sanitizeString(req.params.username || "");
    if (!username) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Username is required"));
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Math.min(Math.max(1, limitParam), 100);

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    const [seller] = await db
      .select(userColumns)
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);

    if (!seller) {
      return res
        .status(404)
        .json(error("PROFILE_NOT_FOUND", "Profile not found"));
    }

    if (seller.isDisabled) {
      return res
        .status(403)
        .json(error("SELLER_UNAVAILABLE", "Seller unavailable"));
    }

    const [profile, userLinks, reviewList, stats] = await Promise.all([
      db
        .select(profileColumns)
        .from(profiles)
        .where(eq(profiles.userId, seller.id))
        .then((results) => {
          if (results.length > 0) return results[0];
          return {
            userId: seller.id,
            displayName: seller.username || "Seller",
            bio: "",
            avatarUrl: null,
            contactEmail: null,
            whatsappNumber: null,
            phoneNumber: null,
            countryCode: null,
            isVerified: false,
            verificationMethod: "none" as const,
            theme: "light" as const,
            backgroundPreset: null,
            gradientPreset: null,
            accentColor: null,
            avgRating: 0,
            totalReviews: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      db
        .select(linkColumns)
        .from(links)
        .where(and(eq(links.userId, seller.id), eq(links.isActive, true)))
        .orderBy(links.sortOrder),
      db
        .select(reviewColumns)
        .from(reviews)
        .where(
          and(eq(reviews.sellerId, seller.id), eq(reviews.isHidden, false)),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(limit + 1),
      getReviewStats(seller.id),
    ]);

    const shouldTrack = req.query.track === "1";
    if (shouldTrack) {
      const clientKey = getClientKey(req);
      const rateLimitResult = checkRateLimit("track", clientKey, {
        maxRequests: 15,
        windowMs: 60 * 1000,
      });

      if (rateLimitResult.allowed) {
        try {
          await recordDailyStat(seller.id, "views");
        } catch {}
      }
    }

    const isOwner = req.session.userId === seller.id;

    let nextCursor: number | null = null;
    let paginatedReviews = reviewList;
    if (reviewList.length > limit) {
      paginatedReviews = reviewList.slice(0, limit);
      nextCursor = paginatedReviews[paginatedReviews.length - 1]?.id ?? null;
    }

    const response: any = {
      user: {
        id: seller.id,
        username: seller.username,
        role: seller.role,
        createdAt: seller.createdAt,
      },
      profile,
      links: userLinks,
      reviews: paginatedReviews,
      stats,
      isOwner,
    };

    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    res.setHeader("X-Robots-Tag", "index, follow");
    // Owners need to see fresh data after saving design changes;
    // visitors can tolerate a short cache window.
    if (isOwner) {
      res.setHeader("Cache-Control", "private, no-cache, must-revalidate");
    } else {
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    }

    return res.status(200).json(ok(response));
  });

  app.patch("/api/me/profile", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;

    if (parsed.data.contactEmail) {
      const [existingEmail] = await db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(
          and(
            eq(profiles.contactEmail, parsed.data.contactEmail),
            ne(profiles.userId, userId),
          ),
        );
      if (existingEmail) {
        return res
          .status(409)
          .json(error("CONTACT_EMAIL_TAKEN", "Contact email already in use"));
      }
    }

    // Build the update object explicitly to handle nullable fields correctly.
    // Drizzle requires `null` (not `undefined`) to set a column to NULL.
    // Fields not in the request body are `undefined` after Zod parsing and
    // must be excluded so they don't accidentally clear existing values.
    const data = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    // String fields — sanitize and include only if provided
    const stringFields = [
      "displayName",
      "bio",
      "avatarUrl",
      "contactEmail",
      "whatsappNumber",
      "phoneNumber",
      "countryCode",
      "theme",
    ] as const;

    for (const field of stringFields) {
      const value = data[field as keyof typeof data];
      if (value !== undefined) {
        updates[field] =
          typeof value === "string" ? sanitizeString(value) : value;
      }
    }

    // Nullable fields — explicitly include `null` when the client sent `null`
    // (meaning "clear this value") versus `undefined` (meaning "don't touch").
    // We check the raw request body to distinguish between "sent null" and
    // "not sent at all", because Zod's .nullable().optional() preserves null.
    const nullableFields = [
      "backgroundPreset",
      "gradientPreset",
      "accentColor",
    ] as const;

    for (const field of nullableFields) {
      if (field in req.body) {
        updates[field] = data[field as keyof typeof data] ?? null;
      }
    }

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();

    if (!updated) {
      return res
        .status(404)
        .json(error("PROFILE_NOT_FOUND", "Profile not found"));
    }

    return res.status(200).json(ok({ profile: updated }));
  });
}
