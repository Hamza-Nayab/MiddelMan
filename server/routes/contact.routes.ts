import type { Express, Request, Response } from "express";
import { and, desc, eq, ilike, lt, or, sql, z } from "./_shared";
import {
  checkRateLimit,
  db,
  error,
  getClientKey,
  logAdminAction,
  ok,
  requireAdmin,
  respondForbiddenFromAuthError,
} from "./_shared";
import { contacts } from "@shared/schema";
import type { ContactStatus } from "@shared/types";

const contactSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  phone: z
    .string()
    .trim()
    .max(50, "Contact information is too long")
    .optional()
    .nullable(),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters"),
});

const adminContactUpdateSchema = z
  .object({
    status: z.enum(["unread", "read", "archived"]).optional(),
    adminNotes: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export function registerContactRoutes(app: Express): void {
  // Public: Submit a contact message (with rate limiting: max 5 requests per 10 mins per IP)
  app.post("/api/contact", async (req: Request, res: Response) => {
    const rateLimitResult = checkRateLimit("contact", getClientKey(req), {
      maxRequests: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return res.status(429).json(
        error(
          "RATE_LIMIT_EXCEEDED",
          "Too many messages sent. Please wait a few minutes before trying again.",
        ),
      );
    }

    const parsed = contactSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        error("VALIDATION_ERROR", "Invalid contact form input", parsed.error.flatten()),
      );
    }

    try {
      const [newContact] = await db
        .insert(contacts)
        .values({
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone ? parsed.data.phone.trim() : null,
          message: parsed.data.message,
          status: "unread",
        })
        .returning();

      return res.status(201).json(
        ok({
          success: true,
          message: "Thank you for contacting us. We will get back to you shortly.",
          contactId: newContact.id,
        }),
      );
    } catch (err) {
      console.error("[contact] Error creating contact submission:", err);
      return res
        .status(500)
        .json(error("INTERNAL_ERROR", "Failed to submit contact message"));
    }
  });

  // Admin: List contact submissions (available to ALL admins)
  app.get("/api/admin/contacts", async (req: Request, res: Response) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const limitParam = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(1, limitParam), 100);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const statusParam = req.query.status as string | undefined;
    const searchQuery = (req.query.q as string | undefined)?.trim() || "";

    const conditions = [];

    if (cursor) {
      conditions.push(lt(contacts.id, cursor));
    }

    if (
      statusParam &&
      ["unread", "read", "archived"].includes(statusParam.toLowerCase())
    ) {
      conditions.push(eq(contacts.status, statusParam.toLowerCase() as ContactStatus));
    }

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      conditions.push(
        or(
          ilike(contacts.name, searchPattern),
          ilike(contacts.email, searchPattern),
          ilike(contacts.message, searchPattern),
          ilike(contacts.phone, searchPattern),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    try {
      const items = await db
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          message: contacts.message,
          status: contacts.status,
          adminNotes: contacts.adminNotes,
          resolvedByAdminId: contacts.resolvedByAdminId,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .where(whereClause)
        .orderBy(desc(contacts.id))
        .limit(limit + 1);

      const hasNextPage = items.length > limit;
      const paginatedItems = hasNextPage ? items.slice(0, limit) : items;
      const nextCursor = hasNextPage
        ? paginatedItems[paginatedItems.length - 1].id
        : null;

      // Count unread contacts for notification badges
      const [unreadCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(eq(contacts.status, "unread"));

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(contacts);

      return res.status(200).json(
        ok({
          items: paginatedItems,
          total: totalCountResult?.count ?? 0,
          unreadCount: unreadCountResult?.count ?? 0,
          nextCursor,
        }),
      );
    } catch (err) {
      console.error("[admin:contacts] Error fetching contacts:", err);
      return res
        .status(500)
        .json(error("INTERNAL_ERROR", "Failed to fetch contact submissions"));
    }
  });

  // Admin: Get single contact submission by ID
  app.get("/api/admin/contacts/:id", async (req: Request, res: Response) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const contactId = Number(req.params.id);
    if (Number.isNaN(contactId) || contactId <= 0) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid contact ID"));
    }

    try {
      const [contact] = await db
        .select({
          id: contacts.id,
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          message: contacts.message,
          status: contacts.status,
          adminNotes: contacts.adminNotes,
          resolvedByAdminId: contacts.resolvedByAdminId,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        })
        .from(contacts)
        .where(eq(contacts.id, contactId));

      if (!contact) {
        return res.status(404).json(error("NOT_FOUND", "Contact submission not found"));
      }

      return res.status(200).json(ok(contact));
    } catch (err) {
      console.error("[admin:contacts] Error fetching contact by ID:", err);
      return res
        .status(500)
        .json(error("INTERNAL_ERROR", "Failed to fetch contact submission"));
    }
  });

  // Admin: Update contact status or notes
  app.patch("/api/admin/contacts/:id", async (req: Request, res: Response) => {
    let adminUser;
    try {
      adminUser = await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const contactId = Number(req.params.id);
    if (Number.isNaN(contactId) || contactId <= 0) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid contact ID"));
    }

    const parsed = adminContactUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        error("VALIDATION_ERROR", "Invalid update payload", parsed.error.flatten()),
      );
    }

    try {
      const [existing] = await db
        .select({ id: contacts.id, status: contacts.status })
        .from(contacts)
        .where(eq(contacts.id, contactId));

      if (!existing) {
        return res.status(404).json(error("NOT_FOUND", "Contact submission not found"));
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (parsed.data.status !== undefined) {
        updateData.status = parsed.data.status;
        if (parsed.data.status !== "unread") {
          updateData.resolvedByAdminId = adminUser.id;
        }
      }

      if (parsed.data.adminNotes !== undefined) {
        updateData.adminNotes = parsed.data.adminNotes;
      }

      const [updated] = await db
        .update(contacts)
        .set(updateData)
        .where(eq(contacts.id, contactId))
        .returning();

      await logAdminAction(adminUser.id, "UPDATE_CONTACT", undefined, {
        contactId,
        previousStatus: existing.status,
        newStatus: parsed.data.status,
      });

      return res.status(200).json(ok({ contact: updated }));
    } catch (err) {
      console.error("[admin:contacts] Error updating contact submission:", err);
      return res
        .status(500)
        .json(error("INTERNAL_ERROR", "Failed to update contact submission"));
    }
  });
}
