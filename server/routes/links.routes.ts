import type { Express } from "express";
import { and, eq, inArray, sql } from "./_shared";
import {
  checkRateLimit,
  db,
  error,
  getClientKey,
  linkColumns,
  linkCreateSchema,
  linkReorderSchema,
  links,
  linkUpdateSchema,
  ok,
  recordDailyStat,
  requireAuth,
  requireRole,
  sanitizeString,
  users,
} from "./_shared";

export function registerLinksRoutes(app: Express): void {
  app.get("/api/profile/:userId/links", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const userLinks = await db
      .select(linkColumns)
      .from(links)
      .where(and(eq(links.userId, userId), eq(links.isActive, true)))
      .orderBy(links.sortOrder);

    if (userLinks.length > 0) {
      return res.status(200).json(ok({ links: userLinks }));
    }

    const [seller] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId));

    if (!seller || seller.role !== "seller") {
      return res
        .status(404)
        .json(error("PROFILE_NOT_FOUND", "Profile not found"));
    }

    return res.status(200).json(ok({ links: [] }));
  });

  app.post("/api/profile/:userId/click", async (req, res) => {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid user id"));
    }

    const clientKey = getClientKey(req);
    const rateLimitResult = checkRateLimit("click", clientKey, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return res
        .status(429)
        .json(
          error(
            "CLICK_RATE_LIMITED",
            "Too many profile clicks. Maximum 30 per minute.",
            { retryAfter: rateLimitResult.resetIn },
          ),
        );
    }

    try {
      await recordDailyStat(userId, "clicks");
    } catch {}

    return res.status(200).json(ok({ recorded: true }));
  });

  app.get("/api/me/links", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const userId = req.session.userId!;

    const userLinks = await db
      .select(linkColumns)
      .from(links)
      .where(eq(links.userId, userId))
      .orderBy(links.sortOrder);

    return res.status(200).json(ok({ links: userLinks }));
  });

  app.post("/api/me/links", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const parsed = linkCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(links)
      .where(eq(links.userId, userId));

    if (Number(count) >= 12) {
      return res
        .status(400)
        .json(
          error(
            "LINK_LIMIT_EXCEEDED",
            "Maximum of 12 links allowed per seller",
          ),
        );
    }

    const [created] = await db
      .insert(links)
      .values({
        userId,
        icon: parsed.data.icon,
        title: sanitizeString(parsed.data.title),
        url: sanitizeString(parsed.data.url),
        sortOrder: Number(count) || 0,
      })
      .returning();

    return res.status(201).json(ok({ link: created }));
  });

  app.patch("/api/me/links/:id", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const linkId = Number(req.params.id);
    if (Number.isNaN(linkId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid link id"));
    }

    const parsed = linkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;

    const [existing] = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId)));

    if (!existing) {
      return res.status(404).json(error("LINK_NOT_FOUND", "Link not found"));
    }

    const updatedFields = {
      ...parsed.data,
      updatedAt: new Date(),
    } as Record<string, unknown>;

    ["title", "url", "icon"].forEach((field) => {
      const value = updatedFields[field];
      if (typeof value === "string") {
        updatedFields[field] = sanitizeString(value);
      }
    });

    const [updated] = await db
      .update(links)
      .set(updatedFields)
      .where(eq(links.id, linkId))
      .returning();

    return res.status(200).json(ok({ link: updated }));
  });

  app.patch("/api/me/links/reorder", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const parsed = linkReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const userId = req.session.userId!;
    const { orderedIds } = parsed.data;

    const existingLinks = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.userId, userId), inArray(links.id, orderedIds)));

    if (existingLinks.length !== orderedIds.length) {
      return res
        .status(404)
        .json(
          error(
            "LINK_NOT_FOUND",
            "Some links not found or don't belong to user",
          ),
        );
    }

    const caseConditions = orderedIds
      .map((id, index) => `WHEN ${id} THEN ${index}`)
      .join(" ");

    await db.execute(
      sql`UPDATE links SET sort_order = CASE id ${sql.raw(caseConditions)} END, updated_at = NOW() WHERE user_id = ${userId} AND id = ANY(${orderedIds})`,
    );

    return res.status(200).json(ok({ updated: true }));
  });

  app.delete("/api/me/links/:id", async (req, res) => {
    try {
      requireAuth(req.session.userId);
      await requireRole(req.session.userId, "seller");
    } catch {
      return res.status(403).json(error("FORBIDDEN", "Forbidden"));
    }

    const linkId = Number(req.params.id);
    if (Number.isNaN(linkId)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid link id"));
    }

    const userId = req.session.userId!;

    const [deleted] = await db
      .delete(links)
      .where(and(eq(links.id, linkId), eq(links.userId, userId)))
      .returning({ id: links.id });

    if (!deleted) {
      return res.status(404).json(error("LINK_NOT_FOUND", "Link not found"));
    }

    return res.status(200).json(ok({ deleted: true }));
  });
}
