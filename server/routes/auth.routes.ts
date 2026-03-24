import type { Express } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import sharp from "sharp";
import { and, eq, inArray, ne, sql, z } from "./_shared";
import {
  db,
  error,
  generateUsernameSuggestions,
  getClientKey,
  googleAuthCallbackHandler,
  googleAuthHandler,
  loginSchema,
  ok,
  onboardingSchema,
  profileColumns,
  profiles,
  registerSchema,
  requireAuth,
  sanitizeString,
  uploadAvatarToR2,
  userColumns,
  usernameSchema,
  users,
  changeUsernameSchema,
  checkRateLimit,
} from "./_shared";
import { appLog } from "../lib/logger";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, and WebP files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

const avatarUploadSingle = (req: any, res: any, next: any) => {
  avatarUpload.single("avatar")(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      appLog("warn", "upload", "AVATAR_UPLOAD_REJECTED", {
        requestId: req.requestId,
        reason: "FILE_TOO_LARGE",
      });
      return res.status(400).json(
        error("VALIDATION_ERROR", "File too large", {
          maxSize: "5MB",
        }),
      );
    }

    appLog("warn", "upload", "AVATAR_UPLOAD_REJECTED", {
      requestId: req.requestId,
      reason: "INVALID_UPLOAD",
      error: err instanceof Error ? err.message : "Unknown error",
    });

    return res
      .status(400)
      .json(error("VALIDATION_ERROR", "Invalid avatar upload"));
  });
};

export function registerAuthRoutes(app: Express): void {
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
      const appUrl = process.env.APP_URL || "http://localhost:5005";

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

    const [existingByEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));
    if (existingByEmail) {
      return res.status(409).json(error("EMAIL_TAKEN", "Email already taken"));
    }

    let username: string | null = null;
    if (role === "seller") {
      const possibleUsername = parsed.data.username;
      if (!possibleUsername) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Username is required for sellers"));
      }

      username = possibleUsername.toLowerCase();

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

    const profileData: any = {
      userId: createdUser.id,
      displayName,
    };

    if (role !== "seller") {
      profileData.avatarUrl =
        parsed.data.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${createdUser.id}`;
    }

    await db.insert(profiles).values(profileData);

    req.session.userId = createdUser.id;

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
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        lastUsernameChangedAt: users.lastUsernameChangedAt,
        usernameChangeCount: users.usernameChangeCount,
      })
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

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.username, parsed.data.username), ne(users.id, user.id)),
      );

    if (existing) {
      return res.status(409).json(error("CONFLICT", "Username already taken"));
    }

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

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(404).json(error("NOT_FOUND", "User not found"));
    }

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

    if (!updatedProfile) {
      const [profile] = await db
        .select({
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
          bio: profiles.bio,
        })
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
    const rateLimitResult = checkRateLimit("login", getClientKey(req), {
      maxRequests: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      appLog("warn", "auth", "LOGIN_RATE_LIMITED", {
        requestId: req.requestId,
      });
      return res
        .status(429)
        .json(
          error(
            "LOGIN_RATE_LIMITED",
            "Too many login attempts. Please try again later.",
            { retryAfter: rateLimitResult.resetIn },
          ),
        );
    }

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
      const email = sanitizeString(data.email);
      const [foundUser] = await db
        .select(userColumns)
        .from(users)
        .where(and(eq(users.email, email), eq(users.role, "buyer")));
      user = foundUser;
    } else {
      const identifier = sanitizeString(data.usernameOrEmail);
      const [foundUser] = await db
        .select(userColumns)
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
      appLog("warn", "auth", "LOGIN_FAILED", {
        requestId: req.requestId,
        reason: "INVALID_CREDENTIALS",
      });
      return res
        .status(401)
        .json(error("INVALID_CREDENTIALS", "Invalid credentials"));
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      appLog("warn", "auth", "LOGIN_FAILED", {
        requestId: req.requestId,
        reason: "INVALID_CREDENTIALS",
      });
      return res
        .status(401)
        .json(error("INVALID_CREDENTIALS", "Invalid credentials"));
    }

    if (user.isDisabled) {
      appLog("warn", "auth", "LOGIN_BLOCKED_DISABLED_ACCOUNT", {
        requestId: req.requestId,
        userId: user.id,
      });
      return res.status(403).json(
        error("ACCOUNT_DISABLED", "Account has been disabled", {
          reason: user.disabledReason || undefined,
        }),
      );
    }

    req.session.userId = user.id;

    req.session.save((err) => {
      if (err) {
        appLog("error", "auth", "SESSION_SAVE_FAILED", {
          requestId: req.requestId,
          userId: user.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
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
      res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.status(200).json(ok({ loggedOut: true }));
    });
  });

  app.post("/api/me/avatar", avatarUploadSingle, async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch {
      return res.status(401).json(error("UNAUTHORIZED", "Unauthorized"));
    }

    if (!req.file) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "No file provided", { field: "avatar" }),
        );
    }

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

    if (req.file.size > MAX_UPLOAD_BYTES) {
      return res.status(400).json(
        error("VALIDATION_ERROR", "File too large", {
          maxSize: "5MB",
          received: `${(req.file.size / 1024 / 1024).toFixed(1)}MB`,
        }),
      );
    }

    try {
      const userId = req.session.userId!;

      const rateLimitResult = checkRateLimit("avatar", String(userId), {
        maxRequests: 5,
        windowMs: 60 * 60 * 1000,
      });

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

      let processedBuffer: Buffer;
      try {
        processedBuffer = await sharp(req.file.buffer, {
          limitInputPixels: 40_000_000,
        })
          .resize(256, 256, { fit: "cover", position: "center" })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        return res.status(400).json(
          error("VALIDATION_ERROR", "Invalid or corrupted image file", {
            reason: "INVALID_IMAGE",
          }),
        );
      }

      if (processedBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json(
          error("VALIDATION_ERROR", "Processed image too large", {
            maxSize: "5MB",
            received: `${(processedBuffer.length / 1024 / 1024).toFixed(1)}MB`,
          }),
        );
      }

      const avatarUrl = await uploadAvatarToR2(userId, processedBuffer);

      await db
        .update(profiles)
        .set({ avatarUrl })
        .where(eq(profiles.userId, userId));

      return res.status(200).json(ok({ avatarUrl }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error processing image";

      if (message.includes("R2_UPLOAD_FAILED")) {
        appLog("error", "upload", "AVATAR_UPLOAD_FAILED", {
          requestId: req.requestId,
          userId: req.session.userId,
          reason: "R2_UPLOAD_FAILED",
        });
        return res
          .status(500)
          .json(error("R2_UPLOAD_FAILED", "Failed to upload to R2"));
      }

      appLog("error", "upload", "AVATAR_UPLOAD_FAILED", {
        requestId: req.requestId,
        userId: req.session.userId,
        reason: "UPLOAD_ERROR",
      });

      return res
        .status(500)
        .json(error("UPLOAD_ERROR", "Failed to upload avatar"));
    }
  });

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

    const [user] = await db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      if (req.session) {
        req.session.userId = undefined;
      }
      return res.status(200).json(ok({ user: null, profile: null }));
    }

    if (user.isDisabled) {
      req.session.destroy(() => {});
      return res.status(403).json(
        error("ACCOUNT_DISABLED", "Your account has been disabled", {
          reason: user.disabledReason || undefined,
        }),
      );
    }

    let profile = null;
    [profile] = await db
      .select(profileColumns)
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
}
