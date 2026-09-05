/**
 * Reserved usernames that cannot be registered or claimed by users.
 * This prevents collisions with application routes (in App.tsx),
 * system paths, SEO/SSR routes, brand names, and security/admin endpoints.
 */
export const RESERVED_USERNAMES = new Set<string>([
  // Core Application Routes (from App.tsx & SSR routes)
  "",
  "about",
  "access-not-available",
  "admin",
  "admins",
  "analytics",
  "api",
  "app",
  "assets",
  "auth",
  "blog",
  "buyer",
  "buyers",
  "checkout",
  "contact",
  "contacts",
  "dashboard",
  "deals",
  "demo",
  "disabled",
  "dispute",
  "disputes",
  "escrow",
  "explore",
  "faq",
  "faqs",
  "featured",
  "forgot-password",
  "help",
  "home",
  "illustrations",
  "index",
  "landing",
  "landing-v2",
  "legal",
  "login",
  "logout",
  "my-reviews",
  "notifications",
  "onboarding",
  "order",
  "orders",
  "payment",
  "payments",
  "privacy",
  "profile",
  "profiles",
  "register",
  "reset-password",
  "review",
  "reviews",
  "search",
  "seller",
  "sellers",
  "settings",
  "signin",
  "signout",
  "signup",
  "support",
  "terms",
  "terms-of-service",
  "transactions",
  "trust",
  "user",
  "users",
  "v2",
  "verified",
  "verify",

  // Static Assets & Web Meta Files
  "favicon",
  "favicon.ico",
  "favicon.png",
  "robots.txt",
  "sitemap.xml",
  "sitemap",
  "llms.txt",
  "manifest.json",
  "manifest",
  "opengraph.jpg",
  "opengraph",
  "well-known",
  ".well-known",
  "security.txt",

  // System, Infrastructure & Security keywords
  "administrator",
  "billing",
  "dev",
  "developer",
  "email",
  "graphql",
  "health",
  "healthcheck",
  "mail",
  "mod",
  "moderator",
  "null",
  "owner",
  "pricing",
  "root",
  "security",
  "staff",
  "status",
  "superadmin",
  "sysadmin",
  "system",
  "test",
  "testing",
  "undefined",
  "webhook",
  "webhooks",

  // Brand Names & Official Identifiers
  "middelmen",
  "middleman",
  "middelman",
  "middel.men",
  "middle.man",
  "middel_men",
  "middle_man",
  "trusthread",
  "official",
  "middelmen-admin",
  "middelmen-official",
  "middleman-official",
  "verified-seller",
]);

export const RESERVED_USERNAME_ERROR_MESSAGE =
  "This username is reserved and cannot be used";

/**
 * Checks whether a given username is in the reserved username list.
 * Case-insensitive, trims leading/trailing whitespace, and checks both
 * the exact string and stripped version (without outer punctuation).
 */
export function isReservedUsername(username: string | null | undefined): boolean {
  if (!username || typeof username !== "string") return false;
  const normalized = username.trim().toLowerCase();
  if (RESERVED_USERNAMES.has(normalized)) return true;

  // Also check if stripped of surrounding punctuation matches a reserved word
  // (e.g. "_admin_", ".terms.")
  const stripped = normalized.replace(/^[._-]+|[._-]+$/g, "");
  if (stripped && RESERVED_USERNAMES.has(stripped)) return true;

  return false;
}
