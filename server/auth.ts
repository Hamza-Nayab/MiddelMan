import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { profiles, users } from "@shared/schema";
import type { UserRole } from "@shared/types";
import { generateUniqueUsername } from "./user-helpers";

type SessionUser = {
  id: number;
  role: UserRole;
  isNewUser?: boolean;
};

const userColumns = {
  id: users.id,
  username: users.username,
  email: users.email,
  passwordHash: users.passwordHash,
  googleId: users.googleId,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  isDisabled: users.isDisabled,
  disabledReason: users.disabledReason,
  disabledAt: users.disabledAt,
  disabledByAdminId: users.disabledByAdminId,
  isMasterAdmin: users.isMasterAdmin,
  lastUsernameChangedAt: users.lastUsernameChangedAt,
  usernameChangeCount: users.usernameChangeCount,
};

const getGoogleCallbackUrl = () => {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const appUrl = process.env.APP_URL || "http://localhost:5005";
  return `${appUrl}/api/auth/google/callback`;
};

passport.serializeUser((user, done) => {
  done(null, (user as SessionUser).id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, id));
    if (!user) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("Google account has no email"));
          }

          const googleId = profile.id;
          const displayName =
            profile.displayName ||
            profile.name?.givenName ||
            email.split("@")[0] ||
            "User";

          const [existingByGoogle] = await db
            .select(userColumns)
            .from(users)
            .where(eq(users.googleId, googleId));

          if (existingByGoogle) {
            return done(null, existingByGoogle as SessionUser);
          }

          const [existingByEmail] = await db
            .select(userColumns)
            .from(users)
            .where(eq(users.email, email));

          let user = existingByEmail;
          let isNewUser = false;

          if (!user) {
            const username = await generateUniqueUsername(email.split("@")[0]);
            const [createdUser] = await db
              .insert(users)
              .values({
                username,
                email,
                googleId,
                role: "buyer",
              })
              .returning();

            await db.insert(profiles).values({
              userId: createdUser.id,
              displayName,
            });

            user = createdUser;
            isNewUser = true;
          } else if (!user.googleId) {
            const [updatedUser] = await db
              .update(users)
              .set({ googleId, updatedAt: new Date() })
              .where(eq(users.id, user.id))
              .returning();
            user = updatedUser;
          }

          const [existingProfile] = await db
            .select({ userId: profiles.userId })
            .from(profiles)
            .where(eq(profiles.userId, user.id));

          if (!existingProfile) {
            await db.insert(profiles).values({
              userId: user.id,
              displayName,
            });
          }

          return done(null, { ...user, isNewUser } as SessionUser);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
} else {
  console.warn(
    "[auth] Google OAuth not configured. Missing GOOGLE_CLIENT_ID/SECRET",
  );
}

export const initAuth = (app: import("express").Express) => {
  app.use(passport.initialize());
  app.use(passport.session());
};

export const googleAuthHandler = passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account",
});

export const googleAuthCallbackHandler = passport.authenticate("google", {
  failureRedirect: "/auth?oauth=failed",
});
