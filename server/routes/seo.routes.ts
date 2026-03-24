import type { Express } from "express";
import { and, desc, eq } from "./_shared";
import { db, error, profiles, users } from "./_shared";

export function registerSeoRoutes(app: Express): void {
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
