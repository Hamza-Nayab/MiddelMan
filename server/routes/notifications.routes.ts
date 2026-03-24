import type { Express } from "express";
import { and, desc, eq, gte } from "./_shared";
import {
  db,
  error,
  notificationColumns,
  notifications,
  ok,
  requireAuth,
  respondForbiddenFromAuthError,
  sql,
} from "./_shared";

export function registerNotificationsRoutes(app: Express): void {
  app.get("/api/me/notifications", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (req.query.limit && Number.isNaN(limitParam)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid limit"));
    }

    if (req.query.cursor && Number.isNaN(cursor!)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid cursor"));
    }

    const showUnreadOnly = req.query.unreadOnly === "true";

    const conditions = [eq(notifications.userId, req.session.userId!)];

    if (showUnreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    if (cursor !== undefined) {
      conditions.push(gte(notifications.id, cursor + 1));
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    const notificationsList = await db
      .select(notificationColumns)
      .from(notifications)
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1);

    let nextCursor: number | null = null;
    let paginatedNotifications = notificationsList;
    if (notificationsList.length > limit) {
      paginatedNotifications = notificationsList.slice(0, limit);
      nextCursor =
        paginatedNotifications[paginatedNotifications.length - 1]?.id ?? null;
    }

    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, req.session.userId!),
          eq(notifications.isRead, false),
        ),
      );

    const response: any = {
      items: paginatedNotifications,
      unreadCount: Number(unreadCount?.count ?? 0),
    };
    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  app.patch("/api/me/notifications/:id/read", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const notificationId = Number(req.params.id);
    if (Number.isNaN(notificationId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid notification id"));
    }

    const [notification] = await db
      .select({ id: notifications.id, userId: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!notification) {
      return res
        .status(404)
        .json(error("NOTIFICATION_NOT_FOUND", "Notification not found"));
    }

    if (notification.userId !== req.session.userId) {
      return res
        .status(403)
        .json(error("FORBIDDEN", "Cannot modify other user's notifications"));
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return res.status(200).json(ok({ notification: updated }));
  });

  app.post("/api/me/notifications/mark-all-read", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, req.session.userId!),
          eq(notifications.isRead, false),
        ),
      );

    return res.status(200).json(ok({ success: true }));
  });
}
