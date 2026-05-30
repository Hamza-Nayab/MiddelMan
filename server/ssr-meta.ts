import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Known static routes that should NOT be treated as profile slugs.
 * Keep in sync with client-side wouter routes in App.tsx.
 */
const KNOWN_ROUTES = new Set([
  "",
  "auth",
  "verified",
  "forgot-password",
  "reset-password",
  "onboarding",
  "dashboard",
  "my-reviews",
  "admin",
  "search",
  "demo",
  "disabled",
  "access-not-available",
  "about",
  "terms",
  // Static assets & API
  "api",
  "assets",
  "favicon.png",
  "robots.txt",
  "sitemap.xml",
  "opengraph.jpg",
  "llms.txt",
  "illustrations",
]);

/**
 * Returns the lowercase username if the path looks like a profile route,
 * or null if it matches a known static route / multi-segment path.
 */
function isProfileRoute(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0].toLowerCase();
  if (KNOWN_ROUTES.has(slug)) return null;
  if (slug.startsWith(".")) return null;
  return slug;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

interface ProfileMeta {
  title: string;
  description: string;
  ogImage: string;
  canonicalUrl: string;
  jsonLd: string;
}

function buildMetaTags(
  profile: {
    username: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    avgRating: number;
    totalReviews: number;
  },
  baseUrl: string,
): ProfileMeta {
  const title = `${profile.displayName} | MiddelMen Trust Profile`;
  const description = profile.bio
    ? `${profile.bio.slice(0, 150)}${profile.bio.length > 150 ? "…" : ""}`
    : `View ${profile.displayName}'s verified reviews, seller reputation, and trusted profile on MiddelMen.`;
  const canonicalUrl = `${baseUrl}/${encodeURIComponent(profile.username)}`;
  const ogImage = profile.avatarUrl || `${baseUrl}/opengraph.jpg`;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      alternateName: profile.username,
      url: canonicalUrl,
      image: ogImage,
      description,
    },
  };

  if (profile.totalReviews > 0) {
    jsonLd.mainEntity.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: profile.avgRating.toFixed(1),
      reviewCount: profile.totalReviews,
    };
  }

  return {
    title,
    description,
    ogImage,
    canonicalUrl,
    jsonLd: JSON.stringify(jsonLd),
  };
}

/**
 * Rewrites the HTML template with profile-specific meta tags, JSON-LD,
 * canonical URL, and OpenGraph / Twitter Card tags.
 */
export function rewriteHtml(html: string, meta: ProfileMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const img = escapeHtml(meta.ogImage);
  const url = escapeHtml(meta.canonicalUrl);

  // 1. Clean existing tags to prevent duplicates or rendering bugs
  // Remove existing <title>...</title>
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  // Remove existing description metas
  html = html.replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "");
  // Remove existing og: property metas
  html = html.replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, "");
  // Remove existing twitter: name metas
  html = html.replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  // Remove existing canonical link tags
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "");
  // Remove existing JSON-LD scripts
  html = html.replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  // 2. Build the optimized, standardized, crawlable SEO tag block
  const seoTags = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${meta.jsonLd}</script>`
  ].join("\n    ");

  // 3. Inject right after <head>
  html = html.replace(/<head[^>]*>/i, (match) => `${match}\n    ${seoTags}`);

  return html;
}

/**
 * Express middleware that detects profile routes (/{username}),
 * looks up the profile in the database, and attaches meta tag data
 * to the request object for downstream HTML rewriting.
 *
 * Must be registered BEFORE the static file handler / Vite catch-all.
 */
export function registerSsrMetaMiddleware(app: Express): void {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    // Only intercept GET requests
    if (req.method !== "GET") return next();

    const username = isProfileRoute(req.path);
    if (!username) return next();

    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          isDisabled: users.isDisabled,
        })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);

      if (!user || user.isDisabled) {
        return next(); // Fall through to SPA (handles 404 display)
      }

      const [profile] = await db
        .select({
          displayName: profiles.displayName,
          bio: profiles.bio,
          avatarUrl: profiles.avatarUrl,
          isVerified: profiles.isVerified,
          avgRating: profiles.avgRating,
          totalReviews: profiles.totalReviews,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id));

      if (!profile) {
        return next();
      }

      // Attach profile meta to request for downstream HTML rewriting
      (req as any).__ssrMeta = buildMetaTags(
        {
          username: user.username!,
          displayName: profile.displayName || user.username || "Seller",
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          isVerified: profile.isVerified,
          avgRating: Number(profile.avgRating) || 0,
          totalReviews: Number(profile.totalReviews) || 0,
        },
        process.env.APP_URL?.replace(/\/$/, "") || "https://middelmen.com",
      );
    } catch (err) {
      // Non-fatal: if DB lookup fails, serve generic HTML
      console.error("[ssr-meta] Error fetching profile for meta:", err);
    }

    return next();
  });
}
