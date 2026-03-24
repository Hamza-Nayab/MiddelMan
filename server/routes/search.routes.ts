import type { Express } from "express";
import {
  checkRateLimit,
  error,
  getClientKey,
  searchController,
} from "./_shared";

export function registerSearchRoutes(app: Express): void {
  app.get("/api/search", async (req, res) => {
    const rateLimitResult = checkRateLimit("search", getClientKey(req), {
      maxRequests: 90,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return res.status(429).json(
        error("SEARCH_RATE_LIMITED", "Too many search requests", {
          retryAfter: rateLimitResult.resetIn,
        }),
      );
    }

    return searchController.search(req, res);
  });

  app.get("/api/search/suggest", searchController.suggest);
}
