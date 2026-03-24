import type { Express } from "express";
import { and, eq, gte, sql } from "./_shared";
import {
  db,
  error,
  ok,
  profileDailyStats,
  profiles,
  requireAdmin,
  respondForbiddenFromAuthError,
  users,
} from "./_shared";

const analyticsCache: Map<string, { data: any; expires: number }> = new Map();

const getCachedAnalytics = (key: string) => {
  const cached = analyticsCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  analyticsCache.delete(key);
  return null;
};

const setCachedAnalytics = (key: string, data: any, ttlSeconds = 60) => {
  analyticsCache.set(key, {
    data,
    expires: Date.now() + ttlSeconds * 1000,
  });
};

export function registerAnalyticsRoutes(app: Express): void {
  app.get("/api/me/analytics", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json(error("UNAUTHORIZED", "Not logged in"));
    }

    const [user] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json(error("NOT_FOUND", "User not found"));
    }

    if (user.role !== "seller") {
      return res.status(403).json(error("FORBIDDEN", "Seller access only"));
    }

    const daysRaw = typeof req.query.days === "string" ? req.query.days : "7";
    const days = Math.min(Math.max(Number(daysRaw) || 7, 1), 30);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    const startDay = startDate.toISOString().slice(0, 10);

    const rows = await db
      .select({
        day: profileDailyStats.day,
        views: profileDailyStats.views,
        clicks: profileDailyStats.clicks,
      })
      .from(profileDailyStats)
      .where(
        and(
          eq(profileDailyStats.userId, userId),
          gte(profileDailyStats.day, startDay),
        ),
      );

    const rowMap = new Map(
      rows.map((row) => {
        const dayValue = row.day as unknown as string | Date;
        const dayKey =
          dayValue instanceof Date
            ? dayValue.toISOString().slice(0, 10)
            : dayValue;
        return [dayKey, row];
      }),
    );

    const series = Array.from({ length: days }, (_, index) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + index);
      const dayKey = day.toISOString().slice(0, 10);
      const match = rowMap.get(dayKey);
      return {
        day: dayKey,
        views: match?.views ?? 0,
        clicks: match?.clicks ?? 0,
      };
    });

    return res.status(200).json(ok({ days: series }));
  });

  app.get("/api/admin/analytics/overview", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const daysParam = req.query.days ? Number(req.query.days) : 7;
    const days = [7, 30].includes(daysParam) ? daysParam : 7;

    const cacheKey = `analytics-overview-${days}`;
    const cached = getCachedAnalytics(cacheKey);
    if (cached) {
      return res.status(200).json(ok(cached));
    }

    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split("T")[0];
    const toDateStr = toDate.toISOString().split("T")[0];

    const [totals] = await db
      .select({
        totalViews: sql<number>`COALESCE(SUM(${profileDailyStats.views}), 0)`,
        totalClicks: sql<number>`COALESCE(SUM(${profileDailyStats.clicks}), 0)`,
      })
      .from(profileDailyStats)
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      );

    const topByViews = await db
      .select({
        userId: profileDailyStats.userId,
        username: users.username,
        displayName: profiles.displayName,
        views: sql<number>`SUM(${profileDailyStats.views})`,
      })
      .from(profileDailyStats)
      .leftJoin(users, eq(profileDailyStats.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, profileDailyStats.userId))
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      )
      .groupBy(profileDailyStats.userId, users.username, profiles.displayName)
      .orderBy(sql`SUM(${profileDailyStats.views}) DESC`)
      .limit(10);

    const topByClicks = await db
      .select({
        userId: profileDailyStats.userId,
        username: users.username,
        displayName: profiles.displayName,
        clicks: sql<number>`SUM(${profileDailyStats.clicks})`,
      })
      .from(profileDailyStats)
      .leftJoin(users, eq(profileDailyStats.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, profileDailyStats.userId))
      .where(
        and(
          sql`${profileDailyStats.day} >= ${fromDateStr}`,
          sql`${profileDailyStats.day} <= ${toDateStr}`,
        ),
      )
      .groupBy(profileDailyStats.userId, users.username, profiles.displayName)
      .orderBy(sql`SUM(${profileDailyStats.clicks}) DESC`)
      .limit(10);

    const result = {
      days,
      totalViews: Number(totals?.totalViews ?? 0),
      totalClicks: Number(totals?.totalClicks ?? 0),
      topSellersByViews: topByViews.map((row) => ({
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        views: Number(row.views ?? 0),
      })),
      topSellersByClicks: topByClicks.map((row) => ({
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        clicks: Number(row.clicks ?? 0),
      })),
    };

    setCachedAnalytics(cacheKey, result, 60);

    return res.status(200).json(ok(result));
  });
}
