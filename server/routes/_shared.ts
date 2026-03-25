import type { Request, Response } from "express";
import {
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
import { createHash } from "crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { db } from "../db";
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
import { googleAuthCallbackHandler, googleAuthHandler } from "../auth";
import { createSearchController } from "../controllers/search.controller";
import { error, ok } from "../lib/api-response";
import { appLog } from "../lib/logger";
import { generateUsernameSuggestions } from "../user-helpers";
import { uploadAvatarToR2 } from "../r2";
import { checkRateLimit } from "../rateLimit";
import {
  getReviewStats,
  refreshSellerReviewStatsCache,
} from "../services/review-stats.service";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export { db };
export {
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
  z,
  S3Client,
  links,
  profileDailyStats,
  profiles,
  reviews,
  reviewDisputes,
  users,
  adminAuditLogs,
  notifications,
  googleAuthCallbackHandler,
  googleAuthHandler,
  error,
  ok,
  generateUsernameSuggestions,
  uploadAvatarToR2,
  checkRateLimit,
  getReviewStats,
  refreshSellerReviewStatsCache,
};

export const searchController = createSearchController({ ok, error });

export const respondForbiddenFromAuthError = (res: Response, err: unknown) => {
  const authErr = err as Error & {
    status?: number;
    code?: string;
    disabledReason?: string;
  };

  if (authErr.code === "ACCOUNT_DISABLED") {
    return res.status(403).json(
      error("ACCOUNT_DISABLED", "Account has been disabled", {
        reason: authErr.disabledReason || undefined,
      }),
    );
  }

  const status = authErr.status || 403;
  if (status === 401) {
    return res.status(401).json(error("UNAUTHORIZED", "Unauthorized"));
  }

  return res.status(403).json(error("FORBIDDEN", "Forbidden"));
};

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

export const loginSchema = z.union([buyerLoginSchema, sellerLoginSchema]);

export const profileUpdateSchema = z
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
    backgroundPreset: z
      .enum(["gradient", "antigravity", "aurora", "iridescence"])
      .nullable()
      .optional(),
    gradientPreset: z
      .enum(["default", "ocean", "sunset", "forest", "berry"])
      .nullable()
      .optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #38b6ff)")
      .nullable()
      .optional(),
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

export const linkCreateSchema = z.object({
  icon: z.enum(linkIconKeys).optional(),
  title: z.string().min(1).max(40),
  url: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), {
      message: "URL must start with https://",
    }),
});

export const linkUpdateSchema = z
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

export const linkReorderSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1),
});

export const reviewCreateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500),
});

export const reviewHideSchema = z.object({
  isHidden: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const reviewDisputeCreateSchema = z.object({
  reason: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
});

export const adminRoleSchema = z.object({
  role: z.enum(["admin", "buyer", "seller"]),
});

export const adminDisableUserSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const adminResolveDisputeSchema = z.object({
  outcome: z.enum(["valid", "rejected"]),
  resolutionNote: z.string().max(1000).optional(),
  hideReview: z.boolean().optional(),
});

export const adminCreateAdminSchema = z.object({
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

const USERNAME_REGEX = /^[a-z0-9._-]{5,20}$/;
const DISPLAYNAME_REGEX = /^[\p{L}\p{N}\s\-_.,!?'"()]+$/u;

export const usernameSchema = z
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

export const registerSchema = z
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

export const changeUsernameSchema = z.object({
  username: usernameSchema,
});

export const onboardingSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().min(10).max(500).optional(),
  username: usernameSchema.optional(),
  role: z.enum(["buyer", "seller"]).optional(),
});

export const sanitizeString = (value: string) => value.trim();

const getUtcDayString = () => new Date().toISOString().slice(0, 10);

export const recordDailyStat = async (
  userId: number,
  type: "views" | "clicks",
) => {
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

export const getClientKey = (req: Request): string => {
  if (req.session?.id) {
    return req.session.id;
  }
  return (req.ip || "unknown").toString();
};

export const requireAuth = (userId?: number) => {
  if (!userId) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
};

export const getSessionUser = async (userId?: number) => {
  if (!userId) return null;
  const [user] = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.id, userId));
  return user || null;
};

export const requireRole = async (
  userId: number | undefined,
  role: "buyer" | "seller" | "admin",
) => {
  const user = await getSessionUser(userId);
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
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

export const requireAdmin = async (userId?: number) => {
  const user = await getSessionUser(userId);
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
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

export const requireMasterAdmin = async (userId?: number) => {
  const user = await requireAdmin(userId);
  if (!user.isMasterAdmin) {
    const err = new Error("FORBIDDEN");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
};

export const logAdminAction = async (
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

  appLog("info", "admin", "ADMIN_ACTION_RECORDED", {
    adminId,
    action,
    targetUserId,
    detailKeys: details ? Object.keys(details) : [],
  });
};

export const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export const getR2Client = () => {
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

export const userColumns = {
  id: users.id,
  username: users.username,
  email: users.email,
  passwordHash: users.passwordHash,
  googleId: users.googleId,
  role: users.role,
  lastUsernameChangedAt: users.lastUsernameChangedAt,
  usernameChangeCount: users.usernameChangeCount,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  isDisabled: users.isDisabled,
  disabledReason: users.disabledReason,
  disabledAt: users.disabledAt,
  disabledByAdminId: users.disabledByAdminId,
  isMasterAdmin: users.isMasterAdmin,
};

export const profileColumns = {
  userId: profiles.userId,
  displayName: profiles.displayName,
  bio: profiles.bio,
  avatarUrl: profiles.avatarUrl,
  contactEmail: profiles.contactEmail,
  whatsappNumber: profiles.whatsappNumber,
  phoneNumber: profiles.phoneNumber,
  countryCode: profiles.countryCode,
  isVerified: profiles.isVerified,
  verificationMethod: profiles.verificationMethod,
  theme: profiles.theme,
  backgroundPreset: profiles.backgroundPreset,
  gradientPreset: profiles.gradientPreset,
  accentColor: profiles.accentColor,
  avgRating: profiles.avgRating,
  totalReviews: profiles.totalReviews,
  createdAt: profiles.createdAt,
  updatedAt: profiles.updatedAt,
};

export const linkColumns = {
  id: links.id,
  userId: links.userId,
  icon: links.icon,
  title: links.title,
  url: links.url,
  isActive: links.isActive,
  sortOrder: links.sortOrder,
  createdAt: links.createdAt,
  updatedAt: links.updatedAt,
};

export const reviewColumns = {
  id: reviews.id,
  sellerId: reviews.sellerId,
  reviewerUserId: reviews.reviewerUserId,
  authorName: reviews.authorName,
  rating: reviews.rating,
  comment: reviews.comment,
  isHidden: reviews.isHidden,
  ipHash: reviews.ipHash,
  userAgentHash: reviews.userAgentHash,
  createdAt: reviews.createdAt,
};

export const notificationColumns = {
  id: notifications.id,
  userId: notifications.userId,
  type: notifications.type,
  title: notifications.title,
  message: notifications.message,
  relatedId: notifications.relatedId,
  isRead: notifications.isRead,
  createdAt: notifications.createdAt,
};
