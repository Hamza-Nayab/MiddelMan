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

    try {
      return await searchController.search(req, res);
    } catch (err) {
      return res.status(500).json(
        error("SEARCH_FAILED", "Search is temporarily unavailable"),
      );
    }
  });

  app.get("/api/search/suggest", async (req, res) => {
    try {
      return await searchController.suggest(req, res);
    } catch (err) {
      return res.status(200).json({ ok: true, data: { suggestions: [] } });
    }
  });
}
