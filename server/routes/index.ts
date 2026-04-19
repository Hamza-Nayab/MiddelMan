import type { Express } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ok } from "../lib/api-response";
import { appLog } from "../lib/logger";
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
const isProduction = process.env.NODE_ENV === "production";

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

const ensureDatabaseBootstrap = async () => {
  try {
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS reviews_seller_created_visible_idx ON reviews (seller_id, created_at DESC, id DESC) WHERE is_hidden = false`,
    );
    await db.execute(
      sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status varchar(20) NOT NULL DEFAULT 'not_requested'`,
    );
    await db.execute(
      sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_request_note text`,
    );
    await db.execute(
      sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz`,
    );
    await db.execute(
      sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamptz`,
    );
    await db.execute(
      sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response text`,
    );
    await db.execute(
      sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_responded_at timestamptz`,
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS seller_reports (
        id serial PRIMARY KEY,
        seller_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reporter_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason varchar(120) NOT NULL,
        message text,
        status varchar(20) NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS review_reports (
        id serial PRIMARY KEY,
        review_id integer NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        seller_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reporter_user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason varchar(120) NOT NULL,
        message text,
        status varchar(20) NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS seller_reports_seller_reporter_idx ON seller_reports (seller_id, reporter_user_id)`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS review_reports_review_reporter_idx ON review_reports (review_id, reporter_user_id)`,
    );
  } catch (err) {
    if (isProduction) {
      throw err;
    }

    appLog("warn", "routes", "DATABASE_BOOTSTRAP_SKIPPED", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
};

export async function registerAllRoutes(app: Express): Promise<void> {
  if (allRoutesRegistered) {
    return;
  }
  allRoutesRegistered = true;

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

  await ensureDatabaseBootstrap();
}
