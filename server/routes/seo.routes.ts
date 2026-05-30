import type { Express } from "express";
import { and, desc, eq } from "./_shared";
import { db, error, profiles, users, ok, checkRateLimit, getClientKey } from "./_shared";

export function registerSeoRoutes(app: Express): void {
  // Public users endpoint for LLM / public crawler access
  app.get("/api/users", async (req, res) => {
    const clientKey = getClientKey(req);
    const rateLimitResult = checkRateLimit("public_users_api", clientKey, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json(
        error("RATE_LIMITED", "Too many requests to public profiles API", {
          retryAfter: rateLimitResult.resetIn,
        }),
      );
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const offsetParam = req.query.offset ? Number(req.query.offset) : 0;

    const limit = Math.min(Math.max(1, limitParam), 100);
    const offset = Math.max(0, offsetParam);

    try {
      const publicUsers = await db
        .select({
          id: users.id,
          username: users.username,
          createdAt: users.createdAt,
          displayName: profiles.displayName,
          bio: profiles.bio,
          avatarUrl: profiles.avatarUrl,
          isVerified: profiles.isVerified,
          avgRating: profiles.avgRating,
          totalReviews: profiles.totalReviews,
          updatedAt: profiles.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(and(eq(users.role, "seller"), eq(users.isDisabled, false)))
        .orderBy(desc(profiles.updatedAt))
        .limit(limit)
        .offset(offset);

      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      return res.status(200).json(ok({ users: publicUsers }));
    } catch (err) {
      console.error("Public users list fetch error:", err);
      return res.status(500).json(error("SERVER_ERROR", "Failed to fetch public users"));
    }
  });

  // Alias for /api/profiles
  app.get("/api/profiles", async (req, res) => {
    const clientKey = getClientKey(req);
    const rateLimitResult = checkRateLimit("public_users_api", clientKey, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json(
        error("RATE_LIMITED", "Too many requests to public profiles API", {
          retryAfter: rateLimitResult.resetIn,
        }),
      );
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const offsetParam = req.query.offset ? Number(req.query.offset) : 0;

    const limit = Math.min(Math.max(1, limitParam), 100);
    const offset = Math.max(0, offsetParam);

    try {
      const publicProfiles = await db
        .select({
          id: users.id,
          username: users.username,
          createdAt: users.createdAt,
          displayName: profiles.displayName,
          bio: profiles.bio,
          avatarUrl: profiles.avatarUrl,
          isVerified: profiles.isVerified,
          avgRating: profiles.avgRating,
          totalReviews: profiles.totalReviews,
          updatedAt: profiles.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(profiles.userId, users.id))
        .where(and(eq(users.role, "seller"), eq(users.isDisabled, false)))
        .orderBy(desc(profiles.updatedAt))
        .limit(limit)
        .offset(offset);

      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      return res.status(200).json(ok({ profiles: publicProfiles }));
    } catch (err) {
      console.error("Public profiles list fetch error:", err);
      return res.status(500).json(error("SERVER_ERROR", "Failed to fetch public profiles"));
    }
  });

  app.get("/sitemap.xml", async (_req, res) => {
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
          const url = `${baseUrl}/${encodeURIComponent(seller.username!)}`;
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
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
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
}

