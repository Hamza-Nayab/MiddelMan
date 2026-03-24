import type { Express } from "express";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import sharp from "sharp";
import { createHash } from "crypto";
import { and, eq, gte, S3Client } from "./_shared";
import {
  checkRateLimit,
  adminResolveDisputeSchema,
  db,
  error,
  getClientKey,
  getR2Client,
  logAdminAction,
  notifications,
  ok,
  profiles,
  refreshSellerReviewStatsCache,
  requireAdmin,
  requireAuth,
  respondForbiddenFromAuthError,
  reviewDisputeCreateSchema,
  reviewDisputes,
  reviews,
  users,
} from "./_shared";
import { appLog } from "../lib/logger";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const disputeEvidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error("Only PDF, PNG, JPEG, and WebP files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

const disputeEvidenceUploadSingle = (req: any, res: any, next: any) => {
  disputeEvidenceUpload.single("evidence")(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      appLog("warn", "upload", "DISPUTE_EVIDENCE_REJECTED", {
        requestId: req.requestId,
        reason: "FILE_TOO_LARGE",
      });
      return res.status(400).json(
        error("VALIDATION_ERROR", "File too large", {
          maxSize: "5MB",
        }),
      );
    }

    appLog("warn", "upload", "DISPUTE_EVIDENCE_REJECTED", {
      requestId: req.requestId,
      reason: "INVALID_UPLOAD",
      error: err instanceof Error ? err.message : "Unknown error",
    });

    return res
      .status(400)
      .json(error("VALIDATION_ERROR", "Invalid evidence upload"));
  });
};

export function registerDisputesRoutes(app: Express): void {
  app.post("/api/me/reviews/:reviewId/dispute", async (req, res) => {
    try {
      requireAuth(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const reviewId = Number(req.params.reviewId);
    if (Number.isNaN(reviewId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid review id"));
    }

    const parsed = reviewDisputeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const rateLimitResult = checkRateLimit("dispute", getClientKey(req), {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return res
        .status(429)
        .json(
          error(
            "DISPUTE_RATE_LIMITED",
            "Too many disputes created. Please try again later.",
            { retryAfter: rateLimitResult.resetIn },
          ),
        );
    }

    const [review] = await db
      .select({ id: reviews.id, sellerId: reviews.sellerId })
      .from(reviews)
      .where(eq(reviews.id, reviewId));

    if (!review) {
      appLog("warn", "dispute", "DISPUTE_CREATE_FAILED", {
        requestId: req.requestId,
        reason: "REVIEW_NOT_FOUND",
        reviewId,
      });
      return res
        .status(404)
        .json(error("REVIEW_NOT_FOUND", "Review not found"));
    }

    if (review.sellerId !== req.session.userId) {
      appLog("warn", "dispute", "DISPUTE_CREATE_FAILED", {
        requestId: req.requestId,
        reason: "FORBIDDEN",
        reviewId,
      });
      return res
        .status(403)
        .json(error("FORBIDDEN", "You can only dispute your own reviews"));
    }

    const [existingDispute] = await db
      .select({ id: reviewDisputes.id })
      .from(reviewDisputes)
      .where(eq(reviewDisputes.reviewId, reviewId));

    if (existingDispute) {
      appLog("warn", "dispute", "DISPUTE_CREATE_FAILED", {
        requestId: req.requestId,
        reason: "DISPUTE_EXISTS",
        reviewId,
      });
      return res
        .status(409)
        .json(
          error("DISPUTE_EXISTS", "A dispute already exists for this review"),
        );
    }

    const [createdDispute] = await db
      .insert(reviewDisputes)
      .values({
        reviewId,
        sellerId: req.session.userId,
        status: "open",
        reason: parsed.data.reason,
        message: parsed.data.message || null,
      })
      .returning();

    return res.status(201).json(ok({ dispute: createdDispute }));
  });

  app.post(
    "/api/me/reviews/:reviewId/dispute/evidence",
    disputeEvidenceUploadSingle,
    async (req, res) => {
      try {
        requireAuth(req.session.userId);
      } catch (err) {
        return respondForbiddenFromAuthError(res, err);
      }

      if (!req.file) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "No file provided"));
      }

      const reviewId = Number(req.params.reviewId);
      if (Number.isNaN(reviewId)) {
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Invalid review id"));
      }

      const [dispute] = await db
        .select({ id: reviewDisputes.id })
        .from(reviewDisputes)
        .where(
          and(
            eq(reviewDisputes.reviewId, reviewId),
            eq(reviewDisputes.sellerId, req.session.userId!),
          ),
        );

      if (!dispute) {
        appLog("warn", "dispute", "DISPUTE_EVIDENCE_UPLOAD_FAILED", {
          requestId: req.requestId,
          reason: "DISPUTE_NOT_FOUND",
          reviewId,
        });
        return res
          .status(404)
          .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
      }

      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      if (fileBuffer.length > MAX_UPLOAD_BYTES) {
        return res.status(400).json(
          error("VALIDATION_ERROR", "File too large", {
            maxSize: "5MB",
          }),
        );
      }

      try {
        if (mimeType === "application/pdf") {
          const startsLikePdf =
            fileBuffer.subarray(0, 5).toString("ascii") === "%PDF-";
          const hasEofMarker = fileBuffer
            .subarray(Math.max(0, fileBuffer.length - 2048))
            .includes(Buffer.from("%%EOF"));
          if (!startsLikePdf || !hasEofMarker) {
            throw new Error("Invalid PDF file");
          }
        } else if (mimeType.startsWith("image/")) {
          await sharp(fileBuffer, { limitInputPixels: 40_000_000 }).metadata();
        }
      } catch {
        appLog("warn", "upload", "DISPUTE_EVIDENCE_REJECTED", {
          requestId: req.requestId,
          reason: "INVALID_FILE_CONTENT",
          mimeType,
        });
        return res
          .status(400)
          .json(error("VALIDATION_ERROR", "Invalid or corrupted file"));
      }

      try {
        const ext = mimeType === "application/pdf" ? "pdf" : "png";
        const fileDigest = createHash("sha256")
          .update(fileBuffer)
          .digest("hex")
          .slice(0, 24);
        const key = `review-disputes/${dispute.id}/${fileDigest}.${ext}`;

        const s3Client = new S3Client({
          region: "auto",
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
          },
        });

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET || "middlemen",
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
          }),
        );

        const publicUrl = `${process.env.R2_PUBLIC_BASE_URL}/${key}`;

        const [updatedDispute] = await db
          .update(reviewDisputes)
          .set({
            evidenceUrl: publicUrl,
            evidenceKey: key,
            evidenceMime: mimeType,
          })
          .where(eq(reviewDisputes.id, dispute.id))
          .returning();

        return res
          .status(200)
          .json(ok({ dispute: updatedDispute, evidenceUrl: publicUrl }));
      } catch (uploadError) {
        appLog("error", "upload", "DISPUTE_EVIDENCE_UPLOAD_FAILED", {
          requestId: req.requestId,
          disputeId: dispute.id,
          error:
            uploadError instanceof Error
              ? uploadError.message
              : "Unknown upload error",
        });
        return res
          .status(500)
          .json(error("UPLOAD_FAILED", "Failed to upload evidence"));
      }
    },
  );

  app.get("/api/admin/disputes", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
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

    const sellerId = req.query.sellerId
      ? Number(req.query.sellerId)
      : undefined;
    if (req.query.sellerId && Number.isNaN(sellerId!)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid seller id"));
    }

    const status = req.query.status ? String(req.query.status) : undefined;
    const validStatuses = ["open", "resolved_valid", "resolved_rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(error("VALIDATION_ERROR", "Invalid status"));
    }

    const conditions = [] as Array<ReturnType<typeof eq | typeof gte>>;
    if (sellerId !== undefined) {
      conditions.push(eq(reviewDisputes.sellerId, sellerId));
    }
    if (status !== undefined) {
      conditions.push(eq(reviewDisputes.status, status as any));
    }
    if (cursor !== undefined) {
      conditions.push(gte(reviewDisputes.id, cursor + 1));
    }

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...(conditions as any[]));

    const disputeList = await db
      .select({
        id: reviewDisputes.id,
        reviewId: reviewDisputes.reviewId,
        sellerId: reviewDisputes.sellerId,
        status: reviewDisputes.status,
        reason: reviewDisputes.reason,
        message: reviewDisputes.message,
        evidenceUrl: reviewDisputes.evidenceUrl,
        evidenceMime: reviewDisputes.evidenceMime,
        createdAt: reviewDisputes.createdAt,
        resolvedAt: reviewDisputes.resolvedAt,
        resolvedByAdminId: reviewDisputes.resolvedByAdminId,
        resolutionNote: reviewDisputes.resolutionNote,
        review: {
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          authorName: reviews.authorName,
          isHidden: reviews.isHidden,
          createdAt: reviews.createdAt,
        },
        seller: {
          id: users.id,
          username: users.username,
          displayName: profiles.displayName,
        },
      })
      .from(reviewDisputes)
      .leftJoin(reviews, eq(reviewDisputes.reviewId, reviews.id))
      .leftJoin(users, eq(reviewDisputes.sellerId, users.id))
      .leftJoin(profiles, eq(profiles.userId, reviewDisputes.sellerId))
      .where(whereClause)
      .orderBy(reviewDisputes.id)
      .limit(limit + 1);

    let nextCursor: number | null = null;
    let paginatedDisputes = disputeList;
    if (disputeList.length > limit) {
      paginatedDisputes = disputeList.slice(0, limit);
      nextCursor = paginatedDisputes[paginatedDisputes.length - 1]?.id ?? null;
    }

    const response: any = { items: paginatedDisputes };
    if (nextCursor) {
      response.nextCursor = nextCursor;
    }

    return res.status(200).json(ok(response));
  });

  app.patch("/api/admin/disputes/:id/resolve", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const disputeId = Number(req.params.id);
    if (Number.isNaN(disputeId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid dispute id"));
    }

    const parsed = adminResolveDisputeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          error("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        );
    }

    const dispute = await db
      .select({
        dispute: {
          id: reviewDisputes.id,
          reviewId: reviewDisputes.reviewId,
          sellerId: reviewDisputes.sellerId,
        },
      })
      .from(reviewDisputes)
      .where(eq(reviewDisputes.id, disputeId))
      .then((rows) => rows[0]);

    if (!dispute) {
      return res
        .status(404)
        .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
    }

    const newStatus =
      parsed.data.outcome === "valid" ? "resolved_valid" : "resolved_rejected";

    const [updatedDispute] = await db
      .update(reviewDisputes)
      .set({
        status: newStatus as any,
        resolvedAt: new Date(),
        resolvedByAdminId: req.session.userId!,
        resolutionNote: parsed.data.resolutionNote,
      })
      .where(eq(reviewDisputes.id, disputeId))
      .returning();

    const shouldHide =
      parsed.data.outcome === "valid" || parsed.data.hideReview === true;
    if (shouldHide && dispute.dispute.reviewId) {
      const [hiddenReview] = await db
        .update(reviews)
        .set({ isHidden: true })
        .where(eq(reviews.id, dispute.dispute.reviewId))
        .returning({ sellerId: reviews.sellerId });

      if (hiddenReview?.sellerId) {
        await refreshSellerReviewStatsCache(hiddenReview.sellerId);
      }
    }

    const notificationType =
      parsed.data.outcome === "valid" ? "dispute_accepted" : "dispute_rejected";
    const notificationTitle =
      parsed.data.outcome === "valid" ? "Dispute Accepted" : "Dispute Rejected";

    let notificationMessage = "";
    if (parsed.data.outcome === "valid") {
      notificationMessage = shouldHide
        ? "Your dispute was reviewed and accepted. The review has been hidden from your profile."
        : "Your dispute was reviewed and accepted.";
    } else {
      notificationMessage = "Your dispute was reviewed and rejected.";
    }

    if (parsed.data.resolutionNote) {
      notificationMessage += `\n\nAdmin note: ${parsed.data.resolutionNote}`;
    }

    await db.insert(notifications).values({
      userId: dispute.dispute.sellerId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      relatedId: disputeId,
    });

    await logAdminAction(req.session.userId!, "RESOLVE_DISPUTE", undefined, {
      targetDisputeId: disputeId,
      outcome: parsed.data.outcome,
      shouldHide,
      resolutionNote: parsed.data.resolutionNote,
    });

    return res.status(200).json(ok({ dispute: updatedDispute }));
  });

  app.delete("/api/admin/disputes/:id/evidence", async (req, res) => {
    try {
      await requireAdmin(req.session.userId);
    } catch (err) {
      return respondForbiddenFromAuthError(res, err);
    }

    const disputeId = Number(req.params.id);
    if (Number.isNaN(disputeId)) {
      return res
        .status(400)
        .json(error("VALIDATION_ERROR", "Invalid dispute id"));
    }

    const [dispute] = await db
      .select({
        id: reviewDisputes.id,
        evidenceKey: reviewDisputes.evidenceKey,
      })
      .from(reviewDisputes)
      .where(eq(reviewDisputes.id, disputeId));

    if (!dispute) {
      return res
        .status(404)
        .json(error("DISPUTE_NOT_FOUND", "Dispute not found"));
    }

    if (dispute.evidenceKey) {
      try {
        const s3Client = getR2Client();
        if (s3Client) {
          const bucketName = process.env.R2_BUCKET;
          if (bucketName) {
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: bucketName,
                Key: dispute.evidenceKey,
              }),
            );
          }
        }
      } catch (err) {
        appLog("warn", "upload", "DISPUTE_EVIDENCE_DELETE_FAILED", {
          requestId: req.requestId,
          disputeId,
          error: err instanceof Error ? err.message : "Unknown delete error",
        });
      }
    }

    const [updatedDispute] = await db
      .update(reviewDisputes)
      .set({
        evidenceUrl: null,
        evidenceKey: null,
        evidenceMime: null,
        deletedEvidenceAt: new Date(),
      })
      .where(eq(reviewDisputes.id, disputeId))
      .returning();

    await logAdminAction(
      req.session.userId!,
      "DELETE_DISPUTE_EVIDENCE",
      undefined,
      {
        targetDisputeId: disputeId,
      },
    );

    return res.status(200).json(ok({ dispute: updatedDispute }));
  });
}
