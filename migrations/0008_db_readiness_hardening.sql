-- Align users.username with current app behavior (buyers may not have usernames)
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;--> statement-breakpoint

-- Ensure hot-path index exists for visible seller reviews ordered by newest
CREATE INDEX IF NOT EXISTS "reviews_seller_created_visible_idx"
  ON "reviews" ("seller_id", "created_at" DESC, "id" DESC)
  WHERE "is_hidden" = false;--> statement-breakpoint

-- Improve dispute list performance when filtered by seller and date
CREATE INDEX IF NOT EXISTS "review_disputes_seller_created_idx"
  ON "review_disputes" ("seller_id", "created_at" DESC);--> statement-breakpoint

-- Add missing FK protection for admin audit records that point to disputes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_audit_logs_target_dispute_id_review_disputes_id_fk'
  ) THEN
    UPDATE "admin_audit_logs"
    SET "target_dispute_id" = NULL
    WHERE "target_dispute_id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "review_disputes"
        WHERE "review_disputes"."id" = "admin_audit_logs"."target_dispute_id"
      );

    ALTER TABLE "admin_audit_logs"
      ADD CONSTRAINT "admin_audit_logs_target_dispute_id_review_disputes_id_fk"
      FOREIGN KEY ("target_dispute_id")
      REFERENCES "review_disputes"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;