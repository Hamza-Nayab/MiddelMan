import type { Express, Request } from "express";
import { type Server } from "http";
import {
  asc,
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import sharp from "sharp";
import { db } from "./db";
import {
  links,
  profileDailyStats,
  profiles,
  reviews,
  reviewDisputes,
  users,
  adminAuditLogs,
  notifications,
} from "@shared/schema";
import { googleAuthCallbackHandler, googleAuthHandler } from "./auth";
import {
  generateUniqueUsername,
  generateUsernameSuggestions,
} from "./user-helpers";
import { uploadAvatarToR2 } from "./r2";
import { checkRateLimit } from "./rateLimit";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

const ok = <T>(data: T) => ({ ok: true, data });
const error = (
  code: string,
  message: string,
  details?: ApiError["details"],
) => ({
  ok: false,
  error: { code, message, details: details || {} },
});

const buyerLoginSchema = z.object({
  loginType: z.literal("buyer"),
  email: z.string().email("Invalid email"),
  password: z.string().min(1),
});

const sellerLoginSchema = z.object({
  loginType: z.literal("seller"),
  usernameOrEmail: z.string().min(3),
  password: z.string().min(1),
});

const loginSchema = z.union([buyerLoginSchema, sellerLoginSchema]);

const profileUpdateSchema = z
  .object({
    displayName: z.string().min(2).max(50).optional(),
    bio: z.string().max(160).optional(),
    avatarUrl: z.string().min(1).max(200).optional(),
    contactEmail: z.string().email().max(254).optional(),
    whatsappNumber: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/, "Invalid E.164 phone format")
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/, "Invalid E.164 phone format")
      .optional(),
    countryCode: z.string().length(2).optional(),
    theme: z.enum(["light", "dark", "gradient"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const linkIconKeys = [
  "website",
  "instagram",
  "linkedin",
  "facebook",
  "x",
  "reddit",
  "youtube",
  "tiktok",
  "whatsapp",
  "snapchat",
  "pinterest",
  "github",
  "shopify",
] as const;

const linkCreateSchema = z.object({
  icon: z.enum(linkIconKeys).optional(),
  title: z.string().min(1).max(40),
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "URL must start with https://",
    }),
});

const linkUpdateSchema = z
  .object({
    icon: z.enum(linkIconKeys).optional(),
    title: z.string().min(1).max(40).optional(),
    url: z
      .string()
      .url()
      .refine((value) => value.startsWith("https://"), {
        message: "URL must start with https://",
      })
      .optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const linkReorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});

const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

const reviewHideSchema = z.object({
  isHidden: z.boolean(),
  reason: z.string().max(500).optional(),
});

const reviewDisputeCreateSchema = z.object({
  reason: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
});

const adminRoleSchema = z.object({
  role: z.enum(["admin", "buyer", "seller"]),
});

const adminDisableUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

const adminEnableUserSchema = z.object({});

const adminResolveDisputeSchema = z.object({
  outcome: z.enum(["valid", "rejected"]),
  resolutionNote: z.string().max(1000).optional(),
  hideReview: z.boolean().optional(),
});

const adminCreateAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-z0-9._-]{5,20}$/,
      "Username must contain only lowercase letters, numbers, dots, underscores, or hyphens",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
});

// Username validation: lowercase only (a-z, 0-9, dot, underscore, hyphen), 5-20 chars
const USERNAME_REGEX = /^[a-z0-9._-]{5,20}$/;

// DisplayName validation: 2-50 chars, no emojis (reject surrogate pairs/emoji ranges)
const DISPLAYNAME_REGEX = /^[\p{L}\p{N}\s\-_.,!?'"()]+$/u;

const usernameSchema = z
  .string()
  .min(5, "Username must be at least 5 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    USERNAME_REGEX,
    "Username must contain only lowercase letters, numbers, dots, underscores, or hyphens",
  );

const displayNameSchema = z
  .string()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name must be at most 50 characters")
  .refine(
    (val) => DISPLAYNAME_REGEX.test(val),
    "Display name contains invalid characters (emojis not allowed)",
  );

const registerSchema = z
  .object({
    displayName: displayNameSchema,
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    role: z.enum(["buyer", "seller"]),
    username: usernameSchema.optional(),
    avatarUrl: z.string().url().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      // If seller, username is required
      if (data.role === "seller" && !data.username) {
        return false;
      }
      return true;
    },
    {
      message: "Username is required for sellers",
      path: ["username"],
    },
  );

const changeUsernameSchema = z.object({
  username: usernameSchema,
});

const onboardingSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().min(10).max(500).optional(),
  username: usernameSchema.optional(),
  role: z.enum(["buyer", "seller"]).optional(),
});

const sanitizeString = (value: string) => value.trim();

const getUtcDayString = () => new Date().toISOString().slice(0, 10);

const recordDailyStat = async (userId: number, type: "views" | "clicks") => {
  const day = getUtcDayString();
  const initialValues =
    type === "views" ? { views: 1, clicks: 0 } : { views: 0, clicks: 1 };
  const updateSet =
    type === "views"
      ? { views: sql`${profileDailyStats.views} + 1`, updatedAt: sql`now()` }
      : { clicks: sql`${profileDailyStats.clicks} + 1`, updatedAt: sql`now()` };

  await db
    .insert(profileDailyStats)
    .values({ userId, day, ...initialValues })
    .onConflictDoUpdate({
      target: [profileDailyStats.userId, profileDailyStats.day],
      set: updateSet,
    });
};

/**
 * Get a unique identifier for rate limiting (prefer sessionId, fallback to IP)
 */
const getClientKey = (req: Request): string => {
  // Prefer session ID if available
  if (req.session?.id) {
    return req.session.id;
  }
  // Fallback to IP (already extracted via trust proxy setting)
  return (req.ip || "unknown").toString();
};

const requireAuth = (userId?: number) => {
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
};

const requireRole = async (
  userId: number | undefined,
  role: "buyer" | "seller" | "admin",
) => {
  const user = await getSessionUser(userId);
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  // Check if account is disabled
  if (user.isDisabled) {
    const err = new Error("ACCOUNT_DISABLED");
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).status = 403;
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).code = "ACCOUNT_DISABLED";
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).disabledReason = user.disabledReason || undefined;
    throw err;
  }
  if (user.role !== role) {
    const err = new Error("FORBIDDEN");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
};

const getSessionUser = async (userId?: number) => {
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user || null;
};

const requireAdmin = async (userId?: number) => {
  const user = await getSessionUser(userId);
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  // Check if account is disabled
  if (user.isDisabled) {
    const err = new Error("ACCOUNT_DISABLED");
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).status = 403;
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).code = "ACCOUNT_DISABLED";
    (
      err as Error & { status?: number; code?: string; disabledReason?: string }
    ).disabledReason = user.disabledReason || undefined;
    throw err;
  }
  if (user.role !== "admin") {
    const err = new Error("FORBIDDEN");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
};

const requireMasterAdmin = async (userId?: number) => {
  const user = await requireAdmin(userId);
  // requireAdmin already checks role==="admin" and disabled status
  if (!user.isMasterAdmin) {
    const err = new Error("FORBIDDEN");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
};

const logAdminAction = async (
  adminId: number,
  action: string,
  targetUserId?: number,
  details?: Record<string, unknown>,
) => {
  await db.insert(adminAuditLogs).values({
    adminId,
    action: action as any,
    targetUserId,
    details,
  });
};

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const getR2Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
};

const getReviewStats = async (sellerId: number, includeHidden = false) => {
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
};

const SEARCH_QUERY_MIN_LENGTH = 2;
const SEARCH_QUERY_MAX_LENGTH = 120;
const SEARCH_TOKEN_MAX_COUNT = 5;
const SEARCH_CACHE_TTL_MS = 30 * 1000;
const SEARCH_DEFAULT_PAGE_SIZE = 15;

const normalizeSearchQuery = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const tokenizeSearchQuery = (value: string) =>
  value
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, SEARCH_TOKEN_MAX_COUNT);

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

type SearchResponsePayload = {
  results: Array<{
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    avgRating: number;
    totalReviews: number;
  }>;
  meta: {
    nextOffset: number | null;
    hasMore: boolean;
  };
};

const searchCache = new Map<
  string,
  {
    expiresAt: number;
    response: SearchResponsePayload;
  }
>();

const getSearchCache = (key: string) => {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return cached.response;
};

const setSearchCache = (key: string, response: SearchResponsePayload) => {
  searchCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    response,
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Multer configuration for avatar uploads with memory storage
  const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (_req, file, cb) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
        cb(new Error("Only JPEG, PNG, and WebP files are allowed"));
      } else {
        cb(null, true);
      }
    },
  });

  // Multer configuration for dispute evidence uploads with memory storage
  const disputeEvidenceUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        cb(new Error("Only PDF, PNG, JPEG, and WebP files are allowed"));
      } else {
        cb(null, true);
      }
    },
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check DB connectivity with a simple query
      await db.execute(sql`SELECT 1`);
      return res.status(200).json(
        ok({
          status: "ok",
          db: "ok",
        }),
      );
    } catch (error) {
      // DB failed, but server is up
      return res.status(200).json(
        ok({
          status: "ok",
          db: "fail",
        }),
      );
    }
  });

  app.get("/api/auth/google", googleAuthHandler);
  app.get(
    "/api/auth/google/callback",
    googleAuthCallbackHandler,
    (req, res) => {
      const user = req.user as {
        id?: number;
        role?: string;
        isNewUser?: boolean;
      };
      const appUrl = process.env.APP_URL || "http://localhost:5010";

      if (user?.id) {
        req.session.userId = user.id;
      }

      if (user?.isNewUser) {
        return res.redirect(`${appUrl}/onboarding/role`);
      }

      if (user?.role === "seller") {
        return res.redirect(`${appUrl}/dashboard`);
      }

      if (user?.role === "admin") {
        return res.redirect(`${appUrl}/admin`);
      }

      return res.redirect(`${appUrl}/my-reviews`);
    },
  );

  app.get("/api/profile/:username", async (req, res) => {
    const username = sanitizeString(req.params.username || "");
    if (!username) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Username is required"));
    }

    const [user] = await db
      .select()
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
      .select()
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
      } catch {
        // Ignore analytics failures to avoid breaking profile views.
      }
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

    // Parse pagination params
    const limitParam = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Math.min(Math.max(1, limitParam), 100); // Clamp to [1, 100]

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    const [seller] = await db
      .select()
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

    // Fetch profile, links, and reviews in parallel
    const [profile, userLinks, reviewList, stats] = await Promise.all([
      // Fetch profile or create a fallback
      db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, seller.id))
        .then((results) => {
          if (results.length > 0) return results[0];
          // Return fallback profile without inserting
          return {
            userId: seller.id,
            displayName: seller.username || "Seller",
            bio: "",
            avatarUrl: null,
            contactEmail: null,
            whatsappNumber: null,
            phoneNumber: null,
            countryCode: null,
            theme: "light" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
      // Fetch active links ordered by sortOrder
      db
        .select()
        .from(links)
        .where(and(eq(links.userId, seller.id), eq(links.isActive, true)))
        .orderBy(links.sortOrder),
      // Fetch non-hidden reviews ordered by createdAt desc
      db
        .select()
        .from(reviews)
        .where(
          and(eq(reviews.sellerId, seller.id), eq(reviews.isHidden, false)),
        )
        .orderBy(desc(reviews.createdAt))
        .limit(limit + 1), // Fetch one extra to detect if there's a next page
      // Fetch review stats
      getReviewStats(seller.id),
    ]);

    // Handle tracking with rate limiting (max 15 per minute per client)
    const shouldTrack = req.query.track === "1";
    if (shouldTrack) {
      const clientKey = getClientKey(req);
      const rateLimitResult = checkRateLimit("track", clientKey, {
        maxRequests: 15,
        windowMs: 60 * 1000, // 1 minute
      });

      // If rate limited, silently skip the write (don't break the profile view)
      if (rateLimitResult.allowed) {
        try {
          await recordDailyStat(seller.id, "views");
        } catch {
          // Ignore analytics failures to avoid breaking profile views.
        }
      }
    }

    const isOwner = req.session.userId === seller.id;

    // Handle pagination
    let nextCursor: number | null = null;
    let paginatedReviews = reviewList;
    if (reviewList.length > limit) {
      paginatedReviews = reviewList.slice(0, limit);
      // Use the ID of the last review as cursor for next page
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

    // SEO headers for public profiles
    res.setHeader("X-Robots-Tag", "index, follow");
    res.setHeader("Cache-Control", "public, max-age=300");

    return res.status(200).json(ok(response));
  });

  app.get("/api/profile/:userId/links", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    // Query 1: Fetch active links first (no verification needed yet)
    const userLinks = await db
      .select()
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.isActive, true)))
      .orderBy(links.sortOrder);

    // If links exist, return immediately (user is implicitly a valid seller)
    if (userLinks.length > 0) {
      return res.status(200).json(ok({ links: userLinks }));
    }

    // Query 2 (lazy): Only verify seller exists if no links found
    const [seller] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    if (!seller || seller.role !== "seller") {
      return res
        .status(404)
        .json(error("PROFILE_NOT_FOUND", "Profile not found"));
    }

    // Return empty links array (seller exists but has no active links)
    return res.status(200).json(ok({ links: [] }));
  });

  app.post("/api/profile/:userId/click", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    // Rate limit: max 30 clicks per minute per client (IP/session)
    const clientKey = getClientKey(req);
    const rateLimitResult = checkRateLimit("click", clientKey, {
      maxRequests: 30,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      return res
        .status(429)
        .json(
          error(
            "CLICK_RATE_LIMITED",
            "Too many profile clicks. Maximum 30 per minute.",
            { retryAfter: rateLimitResult.resetIn },
          ),
        );
    }

    try {
      await recordDailyStat(userId, "clicks");
    } catch {
      // Ignore analytics failures to avoid breaking link clicks.
    }

    return res.status(200).json(ok({ recorded: true }));
  });

  app.get("/api/profile/:userId/reviews", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    // Parse pagination and filter params
    const limitParam = req.query.limit ? Number(req.query.limit) : 5;
    const limit = Math.min(Math.max(1, limitParam), 50); // Clamp to [1, 50]
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    // Parse rating filter (default all, format: "5" or "5,4,3")
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

    // Set cache headers - cache for 5 minutes, allow stale content for 10 minutes
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );

    // Build where clause with rating filter
    const whereConditions = [
      eq(reviews.sellerId, userId),
      eq(reviews.isHidden, false),
      inArray(reviews.rating, ratings),
    ];
    if (cursor !== undefined) {
      whereConditions.push(lt(reviews.id, cursor));
    }

    // Run both queries in parallel for better performance
    const [reviewList, statsRows] = await Promise.all([
      // Query 1: Fetch filtered reviews with pagination
      db
        .select()
        .from(reviews)
        .where(and(...whereConditions))
        .orderBy(desc(reviews.createdAt), desc(reviews.id))
        .limit(limit + 1),

      // Query 2: Fetch stats (breakdown by rating + average)
      db
        .select({
          rating: reviews.rating,
          count: sql<number>`count(*)`,
        })
        .from(reviews)
        .where(and(eq(reviews.sellerId, userId), eq(reviews.isHidden, false)))
        .groupBy(reviews.rating),
    ]);

    // Build rating breakdown (0 for missing ratings)
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

    // Verify seller exists if no reviews found
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

    // Handle pagination
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
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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

    // Check if user has already reviewed this seller
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

    return res.status(201).json(ok({ review: createdReview }));
  });

  // POST /api/me/reviews/:reviewId/dispute - Create a dispute for a review
  app.post("/api/me/reviews/:reviewId/dispute", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const reviewId = Number(req.params.reviewId);
    if (Number.isNaN(reviewId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid review id"));
    }

    const parsed = reviewDisputeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    // Get the review to verify it exists and seller owns it
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, reviewId));

    if (!review) {
      return res
        .status(404)
        .json(error("REVIEW_NOT_FOUND", "Review not found"));
    }

    if (review.sellerId !== req.session.userId) {
      return res
        .status(403)
        .json(error("FORBIDDEN", "You can only dispute your own reviews"));
    }

    // Check if dispute already exists
    const [existingDispute] = await db
      .select({ id: reviewDisputes.id })
      .from(reviewDisputes)
      .where(eq(reviewDisputes.reviewId, reviewId));

    if (existingDispute) {
      return res
        .status(409)
        .json(
          error("DISPUTE_EXISTS", "A dispute already exists for this review"),
        );
    }

    // Create dispute
    const [createdDispute] = await db
      .insert(reviewDisputes)
      .values({
        reviewId,
        sellerId: req.session.userId,
        status: "open",
        reason: parsed.data.reason,
        message: parsed.data.message || null,
      })
      .returning();

    return res.status(201).json(ok({ dispute: createdDispute }));
  });

  // POST /api/me/reviews/:reviewId/dispute/evidence - Upload evidence for a dispute
  app.post(
    "/api/me/reviews/:reviewId/dispute/evidence",
    disputeEvidenceUpload.single("evidence"),
    async (req, res) => {
      try {
        requireAuth(req.session.userId);
      } catch (err) {
        const status = (err as Error & { status?: number }).status || 403;
        return res
          .status(status)
          .json(
            error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
          );
      }

      // Validate file exists
      if (!req.file) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "No file provided"));
      }

      const reviewId = Number(req.params.reviewId);
      if (Number.isNaN(reviewId)) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Invalid review id"));
      }

      // Get dispute
      const [dispute] = await db
        .select()
        .from(reviewDisputes)
        .where(
          and(
            eq(reviewDisputes.reviewId, reviewId),
            eq(reviewDisputes.sellerId, req.session.userId!),
          ),
        );

      if (!dispute) {
        return res
          .status(404)
          .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
      }

      // Validate file content
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      try {
        if (mimeType === "application/pdf") {
          // Check PDF signature
          const pdfSignature = fileBuffer.toString("utf8", 0, 4);
          if (!pdfSignature.startsWith("%PDF")) {
            throw new Error("Invalid PDF file");
          }
        } else if (mimeType.startsWith("image/")) {
          // Validate image with sharp
          await sharp(fileBuffer).metadata();
        }
      } catch {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Invalid or corrupted file"));
      }

      // Upload to R2
      try {
        console.log("[Evidence Upload] Starting R2 upload...");
        console.log("[Evidence Upload] Dispute ID:", dispute.id);
        console.log("[Evidence Upload] File size:", fileBuffer.length, "bytes");
        console.log("[Evidence Upload] MIME type:", mimeType);
        console.log(
          "[Evidence Upload] R2_ENDPOINT:",
          process.env.R2_ENDPOINT ? "Set" : "NOT SET",
        );
        console.log(
          "[Evidence Upload] R2_PUBLIC_BASE_URL:",
          process.env.R2_PUBLIC_BASE_URL ? "Set" : "NOT SET",
        );

        const timestamp = Date.now();
        const ext = mimeType === "application/pdf" ? "pdf" : "png"; // Default to png for images
        const key = `review-disputes/${dispute.id}/${timestamp}.${ext}`;

        console.log("[Evidence Upload] S3 Key:", key);

        const s3Client = new S3Client({
          region: "auto",
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
          },
        });

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET || "middlemen",
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
          }),
        );

        const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
        console.log(
          "[Evidence Upload] Upload successful! Public URL:",
          publicUrl,
        );

        // Update dispute with evidence info
        const [updatedDispute] = await db
          .update(reviewDisputes)
          .set({
            evidenceUrl: publicUrl,
            evidenceKey: key,
            evidenceMime: mimeType,
          })
          .where(eq(reviewDisputes.id, dispute.id))
          .returning();

        console.log(
          "[Evidence Upload] Database updated. Dispute evidence URL:",
          updatedDispute.evidenceUrl,
        );

        return res
          .status(200)
          .json(ok({ dispute: updatedDispute, evidenceUrl: publicUrl }));
      } catch (uploadError) {
        console.error("R2 upload error:", uploadError);
        return res
          .status(500)
          .json(error("UPLOAD_FAILED", "Failed to upload evidence to storage"));
      }
    },
  );

  app.get("/api/search", async (req, res) => {
    const requestStartedAt = Date.now();
    const rawQuery =
      typeof req.query.q === "string"
        ? req.query.q
        : typeof req.query.query === "string"
          ? req.query.query
          : "";
    const normalizedQuery = normalizeSearchQuery(rawQuery);
    const parseEndedAt = Date.now();

    if (!normalizedQuery) {
      const total = Date.now() - requestStartedAt;
      res.setHeader(
        "Server-Timing",
        `parse;dur=${parseEndedAt - requestStartedAt},retrieve;dur=0,serialize;dur=0,total;dur=${total}`,
      );
      return res.status(200).json(
        ok({
          results: [],
          meta: {
            nextOffset: null,
            hasMore: false,
          },
        }),
      );
    }

    if (normalizedQuery.length < SEARCH_QUERY_MIN_LENGTH) {
      return res.status(200).json(
        ok({
          results: [],
          meta: {
            nextOffset: null,
            hasMore: false,
          },
        }),
      );
    }

    if (normalizedQuery.length > SEARCH_QUERY_MAX_LENGTH) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Search query is too long"));
    }

    const tokens = tokenizeSearchQuery(normalizedQuery);
    if (tokens.length === 0) {
      return res.status(200).json(
        ok({
          results: [],
          meta: {
            nextOffset: null,
            hasMore: false,
          },
        }),
      );
    }

    const limitParam = req.query.limit
      ? Number(req.query.limit)
      : SEARCH_DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(1, limitParam), 50);
    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

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

    const cacheKey = `${normalizedQuery}|${limit}|${offset}`;
    const cached = getSearchCache(cacheKey);
    if (cached) {
      const total = Date.now() - requestStartedAt;
      const parseMs = parseEndedAt - requestStartedAt;
      const retrieveMs = Math.max(0, total - parseMs);

      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
      res.setHeader(
        "Server-Timing",
        `parse;dur=${parseMs},retrieve;dur=${retrieveMs},serialize;dur=0,total;dur=${total}`,
      );

      console.log(
        `[search]${req.requestId ? ` [${req.requestId}]` : ""} q="${normalizedQuery}" offset=${offset} limit=${limit} tokens=${tokens.length} results=${cached.results.length} cache=hit parse=${parseMs}ms retrieve=${retrieveMs}ms serialize=0ms total=${total}ms`,
      );

      return res.status(200).json(
        ok({
          ...cached,
        }),
      );
    }

    const escapedNormalized = escapeLikePattern(normalizedQuery);
    const exactPattern = escapedNormalized;
    const prefixPattern = `${escapedNormalized}%`;
    const containsPattern = `%${escapedNormalized}%`;

    const matchByToken = tokens.map((token) => {
      const escaped = escapeLikePattern(token);
      const pattern = `%${escaped}%`;
      const usernamePrefixPattern = `${escaped}%`;
      return or(
        sql`lower(${users.username}) LIKE ${usernamePrefixPattern}`,
        ilike(profiles.displayName, pattern),
        ilike(profiles.contactEmail, pattern),
      );
    });

    const searchScore = sql<number>`
      (
        CASE WHEN lower(${users.username}) = ${exactPattern} THEN 100 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${exactPattern} THEN 85 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${exactPattern} THEN 80 ELSE 0 END +
        CASE WHEN lower(${users.username}) LIKE ${prefixPattern} THEN 50 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${prefixPattern} THEN 35 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${prefixPattern} THEN 30 ELSE 0 END +
        CASE WHEN lower(${users.username}) LIKE ${containsPattern} THEN 10 ELSE 0 END +
        CASE WHEN ${profiles.displayName} ILIKE ${containsPattern} THEN 8 ELSE 0 END +
        CASE WHEN ${profiles.contactEmail} ILIKE ${containsPattern} THEN 6 ELSE 0 END
      )
    `;

    const baseRows = await db
      .select({
        userId: users.id,
        username: users.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        searchScore,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.role, "seller"),
          eq(users.isDisabled, false),
          ...matchByToken,
        ),
      )
      .orderBy(desc(searchScore), asc(users.id))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = baseRows.length > limit;
    const pageRows = hasMore ? baseRows.slice(0, limit) : baseRows;
    const sellerIds = pageRows.map((row) => row.userId);

    const statsRows =
      sellerIds.length > 0
        ? await db
            .select({
              sellerId: reviews.sellerId,
              avgRating: sql<number>`avg(${reviews.rating})`,
              totalReviews: sql<number>`count(*)`,
            })
            .from(reviews)
            .where(
              and(
                inArray(reviews.sellerId, sellerIds),
                eq(reviews.isHidden, false),
              ),
            )
            .groupBy(reviews.sellerId)
        : [];

    const statsBySellerId = new Map(
      statsRows.map((row) => [
        row.sellerId,
        {
          avgRating: Number(row.avgRating ?? 0),
          totalReviews: Number(row.totalReviews ?? 0),
        },
      ]),
    );

    const rankedRows = pageRows
      .map((row) => ({
        ...row,
        stats: statsBySellerId.get(row.userId) || {
          avgRating: 0,
          totalReviews: 0,
        },
      }))
      .sort((a, b) => {
        const scoreDiff =
          Number(b.searchScore ?? 0) - Number(a.searchScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        const reviewDiff = b.stats.totalReviews - a.stats.totalReviews;
        if (reviewDiff !== 0) return reviewDiff;
        return a.userId - b.userId;
      });

    const retrievedAt = Date.now();

    const hydrated = rankedRows
      .filter((row) => row.username)
      .map((row) => ({
        username: row.username as string,
        displayName: row.displayName ?? row.username ?? "Seller",
        avatarUrl: row.avatarUrl ?? null,
        bio: row.bio ?? null,
        avgRating: row.stats.avgRating,
        totalReviews: row.stats.totalReviews,
      }));

    const serializedAt = Date.now();
    const parseMs = parseEndedAt - requestStartedAt;
    const retrieveMs = retrievedAt - parseEndedAt;
    const serializeMs = serializedAt - retrievedAt;
    const totalMs = serializedAt - requestStartedAt;

    const response: SearchResponsePayload = {
      results: hydrated,
      meta: {
        nextOffset: hasMore ? offset + limit : null,
        hasMore,
      },
    };

    setSearchCache(cacheKey, response);

    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader(
      "Server-Timing",
      `parse;dur=${parseMs},retrieve;dur=${retrieveMs},serialize;dur=${serializeMs},total;dur=${totalMs}`,
    );

    console.log(
      `[search]${req.requestId ? ` [${req.requestId}]` : ""} q="${normalizedQuery}" offset=${offset} limit=${limit} tokens=${tokens.length} results=${hydrated.length} hasMore=${hasMore} cache=miss parse=${parseMs}ms retrieve=${retrieveMs}ms serialize=${serializeMs}ms total=${totalMs}ms`,
    );

    return res.status(200).json(ok(response));
  });

  app.get("/api/search/suggest", async (req, res) => {
    const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
    const normalizedQuery = normalizeSearchQuery(rawQuery);

    if (normalizedQuery.length < 2) {
      return res.status(200).json(ok({ suggestions: [] }));
    }

    const prefixPattern = `${escapeLikePattern(normalizedQuery)}%`;

    const rows = await db
      .select({
        username: users.username,
        displayName: profiles.displayName,
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.role, "seller"),
          eq(users.isDisabled, false),
          sql`lower(${users.username}) LIKE ${prefixPattern}`,
        ),
      )
      .orderBy(asc(users.username))
      .limit(5);

    const suggestions = rows
      .filter((row) => row.username)
      .map((row) => ({
        username: row.username as string,
        displayName: row.displayName || row.username || "Seller",
      }));

    return res.status(200).json(ok({ suggestions }));
  });

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const displayName = sanitizeString(parsed.data.displayName);
    const email = sanitizeString(parsed.data.email);
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const role = parsed.data.role;

    // Check email uniqueness
    const [existingByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existingByEmail) {
      return res.status(409).json(error("EMAIL_TAKEN", "Email already taken"));
    }

    // For sellers, username is required and must be unique
    let username: string | null = null;
    if (role === "seller") {
      const possibleUsername = parsed.data.username;
      if (!possibleUsername) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Username is required for sellers"));
      }

      username = possibleUsername;

      // Ensure lowercase
      username = username.toLowerCase();

      // Check username uniqueness
      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username));

      if (existingUsername) {
        return res
          .status(409)
          .json(error("USERNAME_TAKEN", "Username is already taken"));
      }
    }
    // For buyers: username remains NULL

    // Create user
    const createdUserResult = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        role,
      })
      .returning();

    const createdUser = Array.isArray(createdUserResult)
      ? createdUserResult[0]
      : createdUserResult;

    // Create profile
    // For sellers: Leave avatarUrl null so onboarding wizard appears to let them choose avatar
    // For buyers: Set default avatar (optional)
    const profileData: any = {
      userId: createdUser.id,
      displayName,
    };

    // Only set avatar for buyers (sellers choose in onboarding)
    if (role !== "seller") {
      profileData.avatarUrl =
        parsed.data.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${createdUser.id}`;
    }

    await db.insert(profiles).values(profileData);

    // Set session immediately after user creation (auto-login)
    req.session.userId = createdUser.id;

    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res
          .status(500)
          .json(error("SESSION_ERROR", "Failed to create session"));
      }

      res.status(201).json(
        ok({
          user: {
            id: createdUser.id,
            username: createdUser.username,
            role: createdUser.role,
            createdAt: createdUser.createdAt,
          },
        }),
      );
    });
  });

  // Check if username is available
  app.get("/api/username/check", async (req, res) => {
    const { username } = req.query;

    if (!username || typeof username !== "string") {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Username is required"));
    }

    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) {
      return res.status(400).json(
        error("VALIDATION_ERROR", "Invalid username format", {
          format:
            "5-20 characters, lowercase letters, numbers, dots, underscores, hyphens",
        }),
      );
    }

    // Check if username is taken
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username));

    if (existing) {
      return res.status(200).json(
        ok({
          available: false,
          suggestions: await generateUsernameSuggestions(username),
        }),
      );
    }

    return res.status(200).json(ok({ available: true, suggestions: [] }));
  });

  // Change username with 30-day cooldown
  app.patch("/api/me/username", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json(error("UNAUTHORIZED", "Not logged in"));
    }

    const parsed = changeUsernameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(404).json(error("NOT_FOUND", "User not found"));
    }

    if (user.role !== "seller") {
      return res
        .status(403)
        .json(error("FORBIDDEN", "Only sellers can change their username"));
    }

    if (user.usernameChangeCount >= 3) {
      return res.status(403).json(
        error("LIMIT_REACHED", "Username change limit reached", {
          maxChanges: 3,
        }),
      );
    }

    if (user.username === parsed.data.username) {
      return res.status(400).json(error("NO_CHANGE", "Username is unchanged"));
    }

    // Check cooldown: 30 days since last change
    if (user.lastUsernameChangedAt) {
      const lastChange = new Date(user.lastUsernameChangedAt);
      const thirtyDaysAfter = new Date(
        lastChange.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      if (new Date() < thirtyDaysAfter) {
        const daysUntilEligible = Math.ceil(
          (thirtyDaysAfter.getTime() - new Date().getTime()) /
            (24 * 60 * 60 * 1000),
        );
        return res.status(429).json(
          error("RATE_LIMIT", "Username change cooldown active", {
            daysUntilEligible,
            nextAvailableAt: thirtyDaysAfter.toISOString(),
          }),
        );
      }
    }

    // Check if new username is taken
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.username, parsed.data.username), ne(users.id, user.id)),
      );

    if (existing) {
      return res.status(409).json(error("CONFLICT", "Username already taken"));
    }

    // Update username
    const [updatedUser] = await db
      .update(users)
      .set({
        username: parsed.data.username,
        lastUsernameChangedAt: new Date(),
        usernameChangeCount: sql`${users.usernameChangeCount} + 1`,
      })
      .where(eq(users.id, req.session.userId))
      .returning();

    return res.status(200).json(
      ok({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          lastUsernameChangedAt: updatedUser.lastUsernameChangedAt,
          usernameChangeCount: updatedUser.usernameChangeCount,
        },
      }),
    );
  });

  // Complete onboarding: fill in missing seller fields - optimized to 2 queries
  app.patch("/api/me/onboarding", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json(error("UNAUTHORIZED", "Not logged in"));
    }

    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    // Query 1: Fetch user and validate
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(404).json(error("NOT_FOUND", "User not found"));
    }

    // Handle role change if needed (still within initial validation, no extra query)
    if (parsed.data.role === "seller" && user.role === "buyer") {
      if (!parsed.data.username) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Username is required for sellers"));
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, parsed.data.username));

      if (existing) {
        return res
          .status(409)
          .json(error("CONFLICT", "Username already taken"));
      }
    }

    let updatedUser = user;

    // Query 2: Update user and profile together
    // First update user if role change needed
    if (parsed.data.role === "seller" && user.role === "buyer") {
      const [updated] = await db
        .update(users)
        .set({
          role: "seller",
          username: parsed.data.username,
        })
        .where(eq(users.id, req.session.userId))
        .returning();
      if (updated) updatedUser = updated;
    }

    // Always update profile with provided fields
    const profileUpdates: Partial<typeof profiles.$inferInsert> = {};
    if (parsed.data.displayName)
      profileUpdates.displayName = parsed.data.displayName;
    if (parsed.data.avatarUrl) profileUpdates.avatarUrl = parsed.data.avatarUrl;
    if (parsed.data.bio) profileUpdates.bio = parsed.data.bio;

    let updatedProfile = null;
    if (Object.keys(profileUpdates).length > 0) {
      const [updated] = await db
        .update(profiles)
        .set(profileUpdates)
        .where(eq(profiles.userId, req.session.userId))
        .returning();
      updatedProfile = updated;
    }

    // If profile wasn't updated, fetch it once
    if (!updatedProfile) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.session.userId));
      updatedProfile = profile;
    }

    return res.status(200).json(
      ok({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          email: updatedUser.email,
        },
        profile: updatedProfile
          ? {
              displayName: updatedProfile.displayName,
              avatarUrl: updatedProfile.avatarUrl,
              bio: updatedProfile.bio,
            }
          : null,
      }),
    );
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const data = parsed.data;
    let user: typeof users.$inferSelect | undefined;

    if (data.loginType === "buyer") {
      // Buyer login: email + password only, must be role='buyer'
      const email = sanitizeString(data.email);
      const [foundUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.role, "buyer")));
      user = foundUser;
    } else {
      // Seller/Admin login: username OR email + password, must be role in ('seller', 'admin')
      const identifier = sanitizeString(data.usernameOrEmail);
      const [foundUser] = await db
        .select()
        .from(users)
        .where(
          and(
            identifier.includes("@")
              ? eq(users.email, identifier)
              : eq(users.username, identifier),
            inArray(users.role, ["seller", "admin"]),
          ),
        );
      user = foundUser;
    }

    if (!user || !user.passwordHash) {
      return res
        .status(401)
        .json(error("INVALID_CREDENTIALS", "Invalid credentials"));
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return res
        .status(401)
        .json(error("INVALID_CREDENTIALS", "Invalid credentials"));
    }

    // Check if account is disabled before allowing login
    if (user.isDisabled) {
      return res.status(403).json(
        error("ACCOUNT_DISABLED", "Account has been disabled", {
          reason: user.disabledReason || undefined,
        }),
      );
    }

    req.session.userId = user.id;

    // Explicitly save session before responding
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res
          .status(500)
          .json(error("SESSION_ERROR", "Failed to create session"));
      }

      res.status(200).json(
        ok({
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
          },
        }),
      );
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json(ok({ loggedOut: true }));
    });
  });

  app.post(
    "/api/me/avatar",
    avatarUpload.single("avatar"),
    async (req, res) => {
      try {
        requireAuth(req.session.userId);
      } catch {
        return res.status(401).json(error("UNAUTHORIZED", "Unauthorized"));
      }

      // Validate file exists
      if (!req.file) {
        return res
          .status(400)
          .json(
            error("VALIDATION_ERROR", "No file provided", { field: "avatar" }),
          );
      }

      // Validate MIME type
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
      ) {
        return res.status(400).json(
          error("VALIDATION_ERROR", "Invalid file type", {
            allowed: ["image/jpeg", "image/png", "image/webp"],
            received: req.file.mimetype,
          }),
        );
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json(
          error("VALIDATION_ERROR", "File too large", {
            maxSize: "5MB",
            received: `${(req.file.size / 1024 / 1024).toFixed(1)}MB`,
          }),
        );
      }

      try {
        const userId = req.session.userId!;

        // Check rate limit: max 5 uploads per hour per user
        const rateLimitResult = checkRateLimit(
          "avatar",
          String(userId),
          { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 1 hour
        );

        if (!rateLimitResult.allowed) {
          return res
            .status(429)
            .json(
              error(
                "AVATAR_RATE_LIMITED",
                "Too many avatar uploads. Maximum 5 per hour.",
                { retryAfter: rateLimitResult.resetIn },
              ),
            );
        }

        // Process image with Sharp
        // Resize to 256x256 with cover crop, convert to webp, quality 80
        let processedBuffer: Buffer;
        try {
          processedBuffer = await sharp(req.file.buffer)
            .resize(256, 256, { fit: "cover", position: "center" })
            .webp({ quality: 80 })
            .toBuffer();
        } catch (sharpErr) {
          // Invalid image format or corrupted file
          const msg =
            sharpErr instanceof Error ? sharpErr.message : "Unknown error";
          return res.status(400).json(
            error("VALIDATION_ERROR", "Invalid or corrupted image file", {
              reason: "INVALID_IMAGE",
              details: msg.substring(0, 100), // Truncate details for safety
            }),
          );
        }

        // Validate processed image is still under 5MB (shouldn't happen)
        if (processedBuffer.length > 5 * 1024 * 1024) {
          return res.status(400).json(
            error("VALIDATION_ERROR", "Processed image too large", {
              maxSize: "5MB",
              received: `${(processedBuffer.length / 1024 / 1024).toFixed(1)}MB`,
            }),
          );
        }

        // Upload to R2
        const avatarUrl = await uploadAvatarToR2(userId, processedBuffer);

        // Update user profile with new avatar URL
        await db
          .update(profiles)
          .set({ avatarUrl })
          .where(eq(profiles.userId, userId));

        return res.status(200).json(ok({ avatarUrl }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error processing image";

        if (message.includes("R2_UPLOAD_FAILED")) {
          return res.status(500).json(
            error("R2_UPLOAD_FAILED", "Failed to upload to R2", {
              details: message,
            }),
          );
        }

        return res.status(500).json(
          error("UPLOAD_ERROR", "Failed to upload avatar", {
            details: message,
          }),
        );
      }
    },
  );

  app.patch("/api/me/role", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch {
      return res.status(401).json(error("UNAUTHORIZED", "Unauthorized"));
    }

    const roleSchema = z.object({ role: z.enum(["buyer", "seller"]) });
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;
    const [updated] = await db
      .update(users)
      .set({ role: parsed.data.role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    const [existingProfile] = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!existingProfile) {
      await db.insert(profiles).values({
        userId,
        displayName: updated.username || "User",
      });
    }

    return res.status(200).json(
      ok({
        user: {
          id: updated.id,
          username: updated.username,
          role: updated.role,
          createdAt: updated.createdAt,
        },
      }),
    );
  });

  app.get("/api/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(200).json(ok({ user: null, profile: null }));
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      if (req.session) {
        req.session.userId = undefined;
      }
      return res.status(200).json(ok({ user: null, profile: null }));
    }

    // Check if account is disabled and destroy session if it is
    if (user.isDisabled) {
      req.session.destroy(() => {});
      return res.status(403).json(
        error("ACCOUNT_DISABLED", "Your account has been disabled", {
          reason: user.disabledReason || undefined,
        }),
      );
    }

    let profile = null;
    // Get or create profile for all users (buyers and sellers)
    [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile) {
      const [createdProfile] = await db
        .insert(profiles)
        .values({
          userId,
          displayName: user.username || "User",
        })
        .returning();
      profile = createdProfile;
    }

    return res.status(200).json(
      ok({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email,
          lastUsernameChangedAt: user.lastUsernameChangedAt,
          usernameChangeCount: user.usernameChangeCount,
          createdAt: user.createdAt,
          isMasterAdmin: user.isMasterAdmin,
        },
        profile,
      }),
    );
  });

  app.get("/api/me/analytics", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json(error("UNAUTHORIZED", "Not logged in"));
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json(error("NOT_FOUND", "User not found"));
    }

    if (user.role !== "seller") {
      return res.status(403).json(error("FORBIDDEN", "Seller access only"));
    }

    const daysRaw = typeof req.query.days === "string" ? req.query.days : "7";
    const days = Math.min(Math.max(Number(daysRaw) || 7, 1), 30);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    const startDay = startDate.toISOString().slice(0, 10);

    const rows = await db
      .select({
        day: profileDailyStats.day,
        views: profileDailyStats.views,
        clicks: profileDailyStats.clicks,
      })
      .from(profileDailyStats)
      .where(
        and(
          eq(profileDailyStats.userId, userId),
          gte(profileDailyStats.day, startDay),
        ),
      );

    const rowMap = new Map(
      rows.map((row) => {
        const dayValue = row.day as unknown as string | Date;
        const dayKey =
          dayValue instanceof Date
            ? dayValue.toISOString().slice(0, 10)
            : dayValue;
        return [dayKey, row];
      }),
    );

    const series = Array.from({ length: days }, (_, index) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + index);
      const dayKey = day.toISOString().slice(0, 10);
      const match = rowMap.get(dayKey);
      return {
        day: dayKey,
        views: match?.views ?? 0,
        clicks: match?.clicks ?? 0,
      };
    });

    return res.status(200).json(ok({ days: series }));
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

    const updates = {
      ...parsed.data,
      updatedAt: new Date(),
    } as Record<string, unknown>;

    [
      "displayName",
      "bio",
      "avatarUrl",
      "contactEmail",
      "whatsappNumber",
      "phoneNumber",
      "countryCode",
    ].forEach((field) => {
      const value = updates[field];
      if (typeof value === "string") {
        updates[field] = sanitizeString(value);
      }
    });

    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();

    return res.status(200).json(ok({ profile: updated }));
  });

  app.get("/api/me/links", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const userId = req.session.userId!;

    const userLinks = await db
      .select()
      .from(links)
      .where(eq(links.userId, userId))
      .orderBy(links.sortOrder);

    return res.status(200).json(ok({ links: userLinks }));
  });

  app.get("/api/me/reviews", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const sellerId = req.session.userId!;
    const reviewList = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt));

    const stats = await getReviewStats(sellerId, true);

    return res.status(200).json(ok({ reviews: reviewList, stats }));
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
        review: reviews,
        seller: users,
        sellerProfile: profiles,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.sellerId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(reviews.reviewerUserId, reviewerId))
      .orderBy(desc(reviews.createdAt));

    const formatted = results.map((row) => ({
      ...row.review,
      seller: {
        id: row.seller?.id ?? row.review.sellerId,
        username: row.seller?.username ?? null,
        displayName: row.sellerProfile?.displayName ?? null,
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
      .select({ id: reviews.id })
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

    return res.status(200).json(ok({ review: updated }));
  });

  app.post("/api/me/links", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const parsed = linkCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(eq(links.userId, userId));

    // Enforce 12 link limit per seller
    if (Number(count) >= 12) {
      return res
        .status(400)
        .json(
          error(
            "LINK_LIMIT_EXCEEDED",
            "Maximum of 12 links allowed per seller",
          ),
        );
    }

    const [created] = await db
      .insert(links)
      .values({
        userId,
        icon: parsed.data.icon,
        title: sanitizeString(parsed.data.title),
        url: sanitizeString(parsed.data.url),
        sortOrder: Number(count) || 0,
      })
      .returning();

    return res.status(201).json(ok({ link: created }));
  });

  app.patch("/api/me/links/:id", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const linkId = Number(req.params.id);
    if (Number.isNaN(linkId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid link id"));
    }

    const parsed = linkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;

    const [existing] = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId)));

    if (!existing) {
      return res.status(404).json(error("LINK_NOT_FOUND", "Link not found"));
    }

    const updatedFields = {
      ...parsed.data,
      updatedAt: new Date(),
    } as Record<string, unknown>;

    ["title", "url", "icon"].forEach((field) => {
      const value = updatedFields[field];
      if (typeof value === "string") {
        updatedFields[field] = sanitizeString(value);
      }
    });

    const [updated] = await db
      .update(links)
      .set(updatedFields)
      .where(eq(links.id, linkId))
      .returning();

    return res.status(200).json(ok({ link: updated }));
  });

  app.patch("/api/me/links/reorder", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const parsed = linkReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;
    const { orderedIds } = parsed.data;

    // Verify all links belong to the user
    const existingLinks = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.userId, userId), inArray(links.id, orderedIds)));

    if (existingLinks.length !== orderedIds.length) {
      return res
        .status(404)
        .json(
          error(
            "LINK_NOT_FOUND",
            "Some links not found or don't belong to user",
          ),
        );
    }

    // Perform bulk update with CASE WHEN for sortOrder
    const caseConditions = orderedIds
      .map((id, index) => `WHEN ${id} THEN ${index}`)
      .join(" ");

    const result = await db.execute(
      sql`UPDATE links SET sort_order = CASE id ${sql.raw(caseConditions)} END, updated_at = NOW() WHERE user_id = ${userId} AND id = ANY(${orderedIds})`,
    );

    return res.status(200).json(ok({ updated: true }));
  });

  app.delete("/api/me/links/:id", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const linkId = Number(req.params.id);
    if (Number.isNaN(linkId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid link id"));
    }

    const userId = req.session.userId!;

    const [deleted] = await db
      .delete(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId)))
      .returning({ id: links.id });

    if (!deleted) {
      return res.status(404).json(error("LINK_NOT_FOUND", "Link not found"));
    }

    return res.status(200).json(ok({ deleted: true }));
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    // Parse pagination params
    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100); // Clamp to [1, 100]
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    if (req.query.cursor && (Number.isNaN(cursor) || cursor === undefined)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    // Parse filters
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

    // Build filters
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
      // Check if q is numeric (exact ID lookup)
      const numericId = Number(q);
      if (!Number.isNaN(numericId)) {
        filters.push(eq(users.id, numericId));
      } else {
        // Search by email or username (case-insensitive)
        filters.push(
          or(ilike(users.email, `%${q}%`), ilike(users.username, `%${q}%`)),
        );
      }
    }

    // Add cursor filter (pagination)
    if (cursor !== undefined) {
      filters.push(gte(users.id, cursor + 1));
    }

    // Query: fetch limit + 1 to determine if there's a next page
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

    // Determine next cursor
    let nextCursor: number | undefined = undefined;
    let resultItems = items;

    if (items.length > limit) {
      // Remove the extra item
      resultItems = items.slice(0, limit);
      // Set next cursor to the ID of the item we removed (for the next query)
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
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    // Parse pagination params
    const limitParam = req.query.limit ? Number(req.query.limit) : 50;
    const limit = Math.min(Math.max(1, limitParam), 100); // Clamp to [1, 100]
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

    // Determine if there are more results
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
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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

    // Log admin action
    const actionType = parsed.data.isHidden ? "HIDE_REVIEW" : "UNHIDE_REVIEW";
    await logAdminAction(req.session.userId!, actionType, undefined, {
      targetReviewId: reviewId,
      sellerId: updated.sellerId,
      reason: parsed.data.reason,
    });

    return res.status(200).json(ok({ review: updated }));
  });

  app.patch("/api/admin/users/:id/disable", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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

    // Log action
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
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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

    // Log action
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
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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
        // If setting to admin, keep isMasterAdmin as false
        isMasterAdmin:
          parsed.data.role === "admin" ? false : users.isMasterAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return res.status(404).json(error("USER_NOT_FOUND", "User not found"));
    }

    // Log action
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

  // GET /api/admin/disputes - List all disputes with pagination and filters
  app.get("/api/admin/disputes", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    // Parse pagination params
    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100); // Clamp to [1, 100]
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

    const status = req.query.status ? String(req.query.status) : undefined;
    const validStatuses = ["open", "resolved_valid", "resolved_rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid status"));
    }

    const conditions = [] as Array<ReturnType<typeof eq | typeof gte>>;
    if (sellerId !== undefined) {
      conditions.push(eq(reviewDisputes.sellerId, sellerId));
    }
    if (status !== undefined) {
      conditions.push(eq(reviewDisputes.status, status as any));
    }
    if (cursor !== undefined) {
      conditions.push(gte(reviewDisputes.id, cursor + 1));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...(conditions as any[]));

    const disputeList = await db
      .select({
        id: reviewDisputes.id,
        reviewId: reviewDisputes.reviewId,
        sellerId: reviewDisputes.sellerId,
        status: reviewDisputes.status,
        reason: reviewDisputes.reason,
        message: reviewDisputes.message,
        evidenceUrl: reviewDisputes.evidenceUrl,
        evidenceMime: reviewDisputes.evidenceMime,
        createdAt: reviewDisputes.createdAt,
        resolvedAt: reviewDisputes.resolvedAt,
        resolvedByAdminId: reviewDisputes.resolvedByAdminId,
        resolutionNote: reviewDisputes.resolutionNote,
        review: {
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          authorName: reviews.authorName,
          isHidden: reviews.isHidden,
          createdAt: reviews.createdAt,
        },
        seller: {
          id: users.id,
          username: users.username,
          displayName: profiles.displayName,
        },
      })
      .from(reviewDisputes)
      .leftJoin(reviews, eq(reviewDisputes.reviewId, reviews.id))
      .leftJoin(users, eq(reviewDisputes.sellerId, users.id))
      .leftJoin(profiles, eq(profiles.userId, reviewDisputes.sellerId))
      .where(whereClause)
      .orderBy(reviewDisputes.id)
      .limit(limit + 1);

    // Determine if there are more results
    let nextCursor: number | null = null;
    let paginatedDisputes = disputeList;
    if (disputeList.length > limit) {
      paginatedDisputes = disputeList.slice(0, limit);
      nextCursor = paginatedDisputes[paginatedDisputes.length - 1]?.id ?? null;
    }

    const response: any = { items: paginatedDisputes };
    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  // PATCH /api/admin/disputes/:id/resolve - Resolve a dispute
  app.patch("/api/admin/disputes/:id/resolve", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const disputeId = Number(req.params.id);
    if (Number.isNaN(disputeId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid dispute id"));
    }

    const parsed = adminResolveDisputeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    // Fetch dispute with review
    const dispute = await db
      .select({
        dispute: reviewDisputes,
        reviewId: reviews.id,
      })
      .from(reviewDisputes)
      .leftJoin(reviews, eq(reviewDisputes.reviewId, reviews.id))
      .where(eq(reviewDisputes.id, disputeId))
      .then((rows) => rows[0]);

    if (!dispute) {
      return res
        .status(404)
        .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
    }

    // Determine new status
    const newStatus =
      parsed.data.outcome === "valid" ? "resolved_valid" : "resolved_rejected";

    // Update dispute
    const [updatedDispute] = await db
      .update(reviewDisputes)
      .set({
        status: newStatus as any,
        resolvedAt: new Date(),
        resolvedByAdminId: req.session.userId!,
        resolutionNote: parsed.data.resolutionNote,
      })
      .where(eq(reviewDisputes.id, disputeId))
      .returning();

    // Hide review if needed (on valid outcome OR explicit hideReview)
    const shouldHide =
      parsed.data.outcome === "valid" || parsed.data.hideReview === true;
    if (shouldHide && dispute.reviewId) {
      await db
        .update(reviews)
        .set({ isHidden: true })
        .where(eq(reviews.id, dispute.reviewId));
    }

    // Create notification for seller
    const notificationType =
      parsed.data.outcome === "valid" ? "dispute_accepted" : "dispute_rejected";
    const notificationTitle =
      parsed.data.outcome === "valid" ? "Dispute Accepted" : "Dispute Rejected";

    let notificationMessage = "";
    if (parsed.data.outcome === "valid") {
      notificationMessage = shouldHide
        ? "Your dispute was reviewed and accepted. The review has been hidden from your profile."
        : "Your dispute was reviewed and accepted.";
    } else {
      notificationMessage = "Your dispute was reviewed and rejected.";
    }

    if (parsed.data.resolutionNote) {
      notificationMessage += `\n\nAdmin note: ${parsed.data.resolutionNote}`;
    }

    await db.insert(notifications).values({
      userId: dispute.dispute.sellerId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      relatedId: disputeId,
    });

    // Log action
    await logAdminAction(req.session.userId!, "RESOLVE_DISPUTE", undefined, {
      targetDisputeId: disputeId,
      outcome: parsed.data.outcome,
      shouldHide,
      resolutionNote: parsed.data.resolutionNote,
    });

    return res.status(200).json(ok({ dispute: updatedDispute }));
  });

  // DELETE /api/admin/disputes/:id/evidence - Delete dispute evidence from R2
  app.delete("/api/admin/disputes/:id/evidence", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const disputeId = Number(req.params.id);
    if (Number.isNaN(disputeId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid dispute id"));
    }

    // Fetch dispute
    const [dispute] = await db
      .select()
      .from(reviewDisputes)
      .where(eq(reviewDisputes.id, disputeId));

    if (!dispute) {
      return res
        .status(404)
        .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
    }

    // Delete from R2 if evidence exists
    if (dispute.evidenceKey) {
      try {
        const s3Client = getR2Client();
        if (s3Client) {
          const bucketName = process.env.R2_BUCKET;
          if (bucketName) {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: bucketName,
                Key: dispute.evidenceKey,
              }),
            );
          }
        }
      } catch (err) {
        // Idempotent: don't error if file already missing
        console.error("R2 deletion error (non-fatal):", err);
      }
    }

    // Update dispute to clear evidence fields
    const [updatedDispute] = await db
      .update(reviewDisputes)
      .set({
        evidenceUrl: null,
        evidenceKey: null,
        evidenceMime: null,
        deletedEvidenceAt: new Date(),
      })
      .where(eq(reviewDisputes.id, disputeId))
      .returning();

    // Log action
    await logAdminAction(
      req.session.userId!,
      "DELETE_DISPUTE_EVIDENCE",
      undefined,
      {
        targetDisputeId: disputeId,
      },
    );

    return res.status(200).json(ok({ dispute: updatedDispute }));
  });

  // GET /api/admin/sellers/:sellerId - Get user detail for admin (seller or buyer)
  app.get("/api/admin/sellers/:sellerId", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const sellerId = Number(req.params.sellerId);
    if (Number.isNaN(sellerId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid seller id"));
    }

    // Get user
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

    // Get profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, sellerId));

    // Get links (sorted by sortOrder)
    const userLinks = await db
      .select()
      .from(links)
      .where(eq(links.userId, sellerId))
      .orderBy(links.sortOrder);

    // Get stats for reviews RECEIVED (as seller)
    const [sellerStats] = await db
      .select({
        avgRating: sql<number>`COALESCE(AVG(${reviews.rating})::numeric, 0)`,
        totalReviews: sql<number>`COUNT(${reviews.id})`,
      })
      .from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.isHidden, false)));

    // Get recent reviews RECEIVED (limit 20, descending order)
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

    // Get recent reviews GIVEN (as buyer) - limit 20
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

    // Get recent disputes (limit 20, descending order)
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

  // In-memory cache for analytics with TTL
  const analyticsCache: Map<string, { data: any; expires: number }> = new Map();

  const getCachedAnalytics = (key: string) => {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }
    analyticsCache.delete(key);
    return null;
  };

  const setCachedAnalytics = (key: string, data: any, ttlSeconds = 60) => {
    analyticsCache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
  };

  // GET /api/admin/analytics/overview - Get analytics overview
  app.get("/api/admin/analytics/overview", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const daysParam = req.query.days ? Number(req.query.days) : 7;
    const days = [7, 30].includes(daysParam) ? daysParam : 7;

    // Check cache
    const cacheKey = `analytics-overview-${days}`;
    const cached = getCachedAnalytics(cacheKey);
    if (cached) {
      return res.status(200).json(ok(cached));
    }

    // Calculate date range (UTC)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split("T")[0];
    const toDateStr = toDate.toISOString().split("T")[0];

    // Get totals
    const [totals] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${profileDailyStats.views}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${profileDailyStats.clicks}), 0)`,
      })
      .from(profileDailyStats)
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      );

    // Get top sellers by views
    const topByViews = await db
      .select({
        userId: profileDailyStats.userId,
        username: users.username,
        displayName: profiles.displayName,
        views: sql<number>`SUM(${profileDailyStats.views})`,
      })
      .from(profileDailyStats)
      .leftJoin(users, eq(profileDailyStats.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, profileDailyStats.userId))
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      )
      .groupBy(profileDailyStats.userId, users.username, profiles.displayName)
      .orderBy(sql`SUM(${profileDailyStats.views}) DESC`)
      .limit(10);

    // Get top sellers by clicks
    const topByClicks = await db
      .select({
        userId: profileDailyStats.userId,
        username: users.username,
        displayName: profiles.displayName,
        clicks: sql<number>`SUM(${profileDailyStats.clicks})`,
      })
      .from(profileDailyStats)
      .leftJoin(users, eq(profileDailyStats.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, profileDailyStats.userId))
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      )
      .groupBy(profileDailyStats.userId, users.username, profiles.displayName)
      .orderBy(sql`SUM(${profileDailyStats.clicks}) DESC`)
      .limit(10);

    const result = {
      days,
      totalViews: Number(totals?.totalViews ?? 0),
      totalClicks: Number(totals?.totalClicks ?? 0),
      topSellersByViews: topByViews.map((row) => ({
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        views: Number(row.views ?? 0),
      })),
      topSellersByClicks: topByClicks.map((row) => ({
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        clicks: Number(row.clicks ?? 0),
      })),
    };

    // Cache result for 60 seconds
    setCachedAnalytics(cacheKey, result, 60);

    return res.status(200).json(ok(result));
  });

  // GET /api/me/notifications - Get user notifications
  app.get("/api/me/notifications", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    // Parse pagination params
    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    if (req.query.cursor && Number.isNaN(cursor!)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    const showUnreadOnly = req.query.unreadOnly === "true";

    const conditions = [eq(notifications.userId, req.session.userId!)];

    if (showUnreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    if (cursor !== undefined) {
      conditions.push(gte(notifications.id, cursor + 1));
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    const notificationsList = await db
      .select()
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    // Determine if there are more results
    let nextCursor: number | null = null;
    let paginatedNotifications = notificationsList;
    if (notificationsList.length > limit) {
      paginatedNotifications = notificationsList.slice(0, limit);
      nextCursor =
        paginatedNotifications[paginatedNotifications.length - 1]?.id ?? null;
    }

    // Get unread count
    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.session.userId!),
          eq(notifications.isRead, false),
        ),
      );

    const response: any = {
      items: paginatedNotifications,
      unreadCount: Number(unreadCount?.count ?? 0),
    };
    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  // PATCH /api/me/notifications/:id/read - Mark notification as read
  app.patch("/api/me/notifications/:id/read", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid notification id"));
    }

    // Verify notification belongs to user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!notification) {
      return res
        .status(404)
        .json(error("NOTIFICATION_NOT_FOUND", "Notification not found"));
    }

    if (notification.userId !== req.session.userId) {
      return res
        .status(403)
        .json(error("FORBIDDEN", "Cannot modify other user's notifications"));
    }

    // Update notification
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return res.status(200).json(ok({ notification: updated }));
  });

  // POST /api/me/notifications/mark-all-read - Mark all notifications as read
  app.post("/api/me/notifications/mark-all-read", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, req.session.userId!),
          eq(notifications.isRead, false),
        ),
      );

    return res.status(200).json(ok({ success: true }));
  });

  // GET /api/admin/admins - Get all admins (master admin only)
  app.get("/api/admin/admins", async (req, res) => {
    try {
      await requireMasterAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
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

  // POST /api/admin/admins - Create a new admin (master admin only)
  app.post("/api/admin/admins", async (req, res) => {
    try {
      await requireMasterAdmin(req.session.userId);
    } catch (err) {
      const status = (err as Error & { status?: number }).status || 403;
      return res
        .status(status)
        .json(
          error(status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", "Forbidden"),
        );
    }

    const parsed = adminCreateAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    // Check if email or username already exists
    const existingUser = await db
      .select()
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

    // Create profile for the admin
    await db.insert(profiles).values({
      userId: newAdmin.id,
      displayName: parsed.data.displayName || parsed.data.username,
    });

    // Log action
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

  // SEO: Sitemap endpoint
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const sellers = await db
        .select({
          username: users.username,
          updatedAt: profiles.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(and(eq(users.role, "seller"), eq(users.isDisabled, false)))
        .orderBy(desc(profiles.updatedAt));

      const baseUrl = process.env.APP_URL || "https://middelmen.com";

      const urls = sellers
        .filter((s) => s.username)
        .map((seller) => {
          const url = `${baseUrl}/profile/${encodeURIComponent(seller.username!)}`;
          const lastmod = seller.updatedAt
            ? new Date(seller.updatedAt).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        })
        .join("\n");

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(sitemap);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      res
        .status(500)
        .json(error("SITEMAP_ERROR", "Failed to generate sitemap"));
    }
  });

  return httpServer;
}
