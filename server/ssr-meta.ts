import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, profiles, links, reviews } from "@shared/schema";
import { isReservedUsername } from "@shared/reserved-usernames";
import { and, desc, eq, sql } from "drizzle-orm";

/**
 * Known static routes that should NOT be treated as profile slugs.
 * Keep in sync with client-side wouter routes in App.tsx.
 */
const KNOWN_ROUTES = new Set([
  "",
  "auth",
  "verified",
  "verification",
  "verify",
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
  "contact",
  "contacts",
  "v2",
  // Static assets & API
  "api",
  "assets",
  "favicon.png",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "opengraph.jpg",
  "llms.txt",
  "illustrations",
]);

/**
 * Returns the lowercase username if the path looks like a profile route,
 * or null if it matches a known static route / multi-segment path / reserved word.
 */
function isProfileRoute(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length !== 1) return null;
  const slug = segments[0].toLowerCase();
  if (KNOWN_ROUTES.has(slug)) return null;
  if (isReservedUsername(slug)) return null;
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

function sellerProfileReflectingEmailVerification<
  T extends {
    isVerified: boolean;
    verificationStatus: "not_requested" | "pending" | "approved" | "rejected";
  },
>(profile: T, emailVerified: boolean | null | undefined): T {
  if (!emailVerified) {
    return profile;
  }

  return {
    ...profile,
    isVerified: true,
    verificationStatus: "approved",
  };
}

function buildPrerenderHtml(
  displayName: string,
  username: string,
  bio: string | null,
  avatarUrl: string | null,
  isVerified: boolean,
  avgRating: number,
  totalReviews: number,
  linksList: { id: number; title: string; url: string }[],
): string {
  const safeName = escapeHtml(displayName);
  const safeUser = escapeHtml(username);
  const safeBio = bio ? escapeHtml(bio) : "";
  const ratingText =
    totalReviews > 0
      ? `⭐ ${avgRating.toFixed(1)} / 5 (${totalReviews} verified reviews)`
      : "Verified MiddelMen Trust Profile";

  const linksHtml = linksList
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.url)}" rel="noopener noreferrer nofollow" target="_blank">${escapeHtml(l.title)}</a></li>`,
    )
    .join("\n        ");

  return `
    <div id="ssr-profile-prerender" style="max-width:480px;margin:0 auto;padding:2rem 1rem;font-family:system-ui,-apple-system,sans-serif;color:#111;">
      <div style="text-align:center;">
        <h1 style="font-size:1.5rem;font-weight:700;margin:0 0 0.5rem 0;">${safeName}</h1>
        <p style="color:#666;font-size:0.95rem;margin:0 0 1rem 0;">@${safeUser}</p>
        ${safeBio ? `<p style="font-size:0.95rem;line-height:1.5;margin:0 0 1rem 0;">${safeBio}</p>` : ""}
        <div style="font-size:0.875rem;color:#059669;font-weight:600;">${isVerified ? "✓ Verified Seller &bull; " : ""}${ratingText}</div>
      </div>
      ${linksList.length > 0 ? `<div style="margin-top:1.5rem;"><ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.5rem;">${linksHtml}</ul></div>` : ""}
    </div>`;
}

export interface ProfileMeta {
  title: string;
  description: string;
  ogDescription?: string;
  keywords: string;
  ogImage: string;
  canonicalUrl: string;
  jsonLd: string;
  initialBundle?: any;
  prerenderHtml?: string;
}

export function buildMetaTags(
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
  extra?: {
    initialBundle?: any;
    prerenderHtml?: string;
  },
): ProfileMeta {
  const displayName =
    profile.displayName?.trim() || profile.username?.trim() || "Seller";
  const title = `${displayName} | MiddelMen Trust Profile`;
  const description = profile.bio
    ? `Verified reviews & trust profile for ${displayName} (@${profile.username}) on MiddelMen. ${profile.bio.slice(0, 75)}${profile.bio.length > 75 ? "…" : ""}`
    : `Read verified customer reviews, ratings, and seller reputation for ${displayName} (@${profile.username}) on MiddelMen. Check trust score before transacting.`;
  const ogDescription = profile.bio
    ? `Verified reviews & trust profile for ${displayName} (@${profile.username}) on MiddelMen. ${profile.bio.slice(0, 50)}${profile.bio.length > 50 ? "…" : ""}`
    : `Read verified customer reviews, ratings, and trust scores for ${displayName} (@${profile.username}) on MiddelMen.`;
  const keywords = `${displayName}, ${profile.username}, ${displayName} reviews, ${profile.username} reviews, ${displayName} MiddelMen, ${displayName} MiddleMen, ${profile.username} MiddleMen, verified seller reviews, trust profile, MiddelMen, MiddleMen, Middleman`;
  const canonicalUrl = `${baseUrl}/${encodeURIComponent(profile.username)}`;
  const ogImage =
    profile.avatarUrl &&
    (profile.avatarUrl.startsWith("http://") ||
      profile.avatarUrl.startsWith("https://"))
      ? profile.avatarUrl
      : `${baseUrl}/opengraph.jpg`;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${displayName} Reviews & Trust Profile | MiddelMen`,
    description,
    url: canonicalUrl,
    mainEntity: {
      "@type": "Person",
      name: displayName,
      alternateName: profile.username,
      url: canonicalUrl,
      image: ogImage,
      description: profile.bio || description,
    },
  };

  // NOTE: Do NOT add aggregateRating to the Person entity.
  // Google does not support AggregateRating nested under Person and will
  // report "Invalid object type for field parent_node" in Search Console.
  // Only Organization, Product, LocalBusiness, etc. are valid parent types.

  return {
    title,
    description,
    ogDescription,
    keywords,
    ogImage,
    canonicalUrl,
    jsonLd: JSON.stringify(jsonLd),
    initialBundle: extra?.initialBundle,
    prerenderHtml: extra?.prerenderHtml,
  };
}

/**
 * Rewrites the HTML template with profile-specific meta tags, JSON-LD,
 * canonical URL, OpenGraph / Twitter Card tags, initial data bundle, and prerender HTML.
 */
export function rewriteHtml(html: string, meta: ProfileMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const ogD = escapeHtml(meta.ogDescription || meta.description);
  const k = escapeHtml(meta.keywords || "");
  const img = escapeHtml(meta.ogImage);
  const url = escapeHtml(meta.canonicalUrl);

  // 1. Clean existing tags to prevent duplicates or rendering bugs
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  html = html.replace(/<meta[^>]+name=["']description["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]+name=["']keywords["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>/gi, "");
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "");
  html = html.replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  // 2. Build the optimized, standardized, crawlable SEO tag block
  const seoTags = [
    `<title>${t}</title>`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta name="description" content="${d}" />`,
    `<meta name="keywords" content="${k}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="MiddelMen" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${ogD}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:secure_url" content="${img}" />`,
    `<meta property="og:image:type" content="image/jpeg" />`,
    `<meta property="og:image:width" content="1920" />`,
    `<meta property="og:image:height" content="1080" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@middelman" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${ogD}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<script type="application/ld+json">${meta.jsonLd}</script>`
  ].join("\n    ");

  // 3. Inject right after <head>
  html = html.replace(/<head[^>]*>/i, (match) => `${match}\n    ${seoTags}`);

  // 4. Inject initial profile bundle data script if present
  if (meta.initialBundle) {
    const safeBundle = JSON.stringify(meta.initialBundle).replace(/</g, "\\u003c");
    const scriptTag = `<script id="__INITIAL_PROFILE_BUNDLE__" type="application/json">${safeBundle}</script>`;
    html = html.replace("</body>", `  ${scriptTag}\n  </body>`);
  }

  // 5. Inject semantic SSR crawler prerender inside <div id="root">
  if (meta.prerenderHtml) {
    html = html.replace('<div id="root"></div>', `<div id="root">${meta.prerenderHtml}</div>`);
  }

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
          role: users.role,
          createdAt: users.createdAt,
          isDisabled: users.isDisabled,
          emailVerified: users.emailVerified,
        })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);

      if (!user) {
        (req as any).__profileNotFound = true;
        return next();
      }

      if (user.isDisabled) {
        (req as any).__profileDisabled = true;
        return next();
      }

      const [profileResult, userLinks, reviewList] = await Promise.all([
        db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id))
          .limit(1),
        db
          .select()
          .from(links)
          .where(and(eq(links.userId, user.id), eq(links.isActive, true)))
          .orderBy(links.sortOrder),
        db
          .select()
          .from(reviews)
          .where(and(eq(reviews.sellerId, user.id), eq(reviews.isHidden, false)))
          .orderBy(desc(reviews.createdAt), desc(reviews.id))
          .limit(5),
      ]);

      const rawProfile = profileResult[0] || {
        userId: user.id,
        displayName: user.username || "Seller",
        bio: "",
        avatarUrl: null,
        contactEmail: null,
        whatsappNumber: null,
        phoneNumber: null,
        countryCode: null,
        isVerified: false,
        verificationMethod: "none" as const,
        verificationStatus: "not_requested" as const,
        verificationRequestNote: null,
        verificationRequestedAt: null,
        verificationReviewedAt: null,
        theme: "light" as const,
        backgroundPreset: null,
        gradientPreset: null,
        accentColor: null,
        avgRating: 0,
        totalReviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const stats = {
        avgRating: Number(rawProfile.avgRating) || 0,
        totalReviews: Number(rawProfile.totalReviews) || 0,
      };

      const normalizedProfile = {
        ...sellerProfileReflectingEmailVerification(
          rawProfile,
          user.emailVerified,
        ),
        avgRating: stats.avgRating,
        totalReviews: stats.totalReviews,
      };

      const initialBundle = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
        profile: normalizedProfile,
        links: userLinks,
        reviews: reviewList,
        stats,
        isOwner: false,
      };

      const forwardedHost = req.get("x-forwarded-host");
      const host = (forwardedHost || req.get("host") || "").toLowerCase();
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const defaultDomain = isLocal
        ? `http://${host}`
        : "https://www.middelmen.com";

      const rawDisplayName = normalizedProfile.displayName?.trim();
      const rawUsername = user.username?.trim();
      const displayName = rawDisplayName || rawUsername || "Seller";

      const prerenderHtml = buildPrerenderHtml(
        displayName,
        user.username!,
        normalizedProfile.bio,
        normalizedProfile.avatarUrl,
        normalizedProfile.isVerified,
        stats.avgRating,
        stats.totalReviews,
        userLinks.map((l) => ({ id: l.id, title: l.title, url: l.url })),
      );

      (req as any).__ssrMeta = buildMetaTags(
        {
          username: user.username!,
          displayName,
          bio: normalizedProfile.bio,
          avatarUrl: normalizedProfile.avatarUrl,
          isVerified: normalizedProfile.isVerified,
          avgRating: stats.avgRating,
          totalReviews: stats.totalReviews,
        },
        defaultDomain,
        {
          initialBundle,
          prerenderHtml,
        },
      );
    } catch (err) {
      // Non-fatal: if DB lookup fails, serve generic HTML
      console.error("[ssr-meta] Error fetching profile for meta:", err);
    }

    return next();
  });
}

