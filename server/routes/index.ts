import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ok } from "../lib/api-response";
import { registerAdminRoutes } from "./admin.routes";
import { registerAnalyticsRoutes } from "./analytics.routes";
import { registerAuthRoutes } from "./auth.routes";
import { registerDisputesRoutes } from "./disputes.routes";
import { registerLinksRoutes } from "./links.routes";
import { registerNotificationsRoutes } from "./notifications.routes";
import { registerProfileRoutes } from "./profile.routes";
import { registerReviewsRoutes } from "./reviews.routes";
import { registerSearchRoutes } from "./search.routes";
import { registerSeoRoutes } from "./seo.routes";

let allRoutesRegistered = false;

const registerHealthRoutes = (app: Express) => {
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1`);
      return res.status(200).json(
        ok({
          status: "ok",
          db: "ok",
        }),
      );
    } catch {
      return res.status(503).json(
        ok({
          status: "degraded",
          db: "fail",
        }),
      );
    }
  });
};

export async function registerAllRoutes(app: Express): Promise<void> {
  if (allRoutesRegistered) {
    return;
  }
  allRoutesRegistered = true;

  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS reviews_seller_created_visible_idx ON reviews (seller_id, created_at DESC, id DESC) WHERE is_hidden = false`,
  );

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerProfileRoutes(app);
  registerLinksRoutes(app);
  registerReviewsRoutes(app);
  registerDisputesRoutes(app);
  registerSearchRoutes(app);
  registerAdminRoutes(app);
  registerAnalyticsRoutes(app);
  registerNotificationsRoutes(app);
  registerSeoRoutes(app);
}
