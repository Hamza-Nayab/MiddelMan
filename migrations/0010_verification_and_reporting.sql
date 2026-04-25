DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'verification_status'
  ) THEN
    CREATE TYPE "verification_status" AS ENUM (
      'not_requested',
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'report_status'
  ) THEN
    CREATE TYPE "report_status" AS ENUM (
      'open',
      'reviewed',
      'dismissed'
    );
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "verification_status" "verification_status";--> statement-breakpoint

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "verification_request_note" text;--> statement-breakpoint

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "verification_requested_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "verification_reviewed_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "profiles"
  ALTER COLUMN "verification_status" TYPE "verification_status"
  USING (
    CASE
      WHEN "verification_status" IS NULL THEN 'not_requested'
      WHEN "verification_status"::text IN ('not_requested', 'pending', 'approved', 'rejected')
        THEN "verification_status"::text
      ELSE 'not_requested'
    END
  )::"verification_status";--> statement-breakpoint

UPDATE "profiles"
SET "verification_status" = 'not_requested'
WHERE "verification_status" IS NULL;--> statement-breakpoint

ALTER TABLE "profiles"
  ALTER COLUMN "verification_status" SET DEFAULT 'not_requested';--> statement-breakpoint

ALTER TABLE "profiles"
  ALTER COLUMN "verification_status" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "seller_response" text;--> statement-breakpoint

ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "seller_responded_at" timestamp with time zone;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "seller_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reporter_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reason" varchar(120) NOT NULL,
  "message" text,
  "status" "report_status" NOT NULL DEFAULT 'open',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "review_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "review_id" integer NOT NULL REFERENCES "reviews"("id") ON DELETE cascade,
  "seller_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reporter_user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "reason" varchar(120) NOT NULL,
  "message" text,
  "status" "report_status" NOT NULL DEFAULT 'open',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "seller_reports"
  ALTER COLUMN "status" TYPE "report_status"
  USING (
    CASE
      WHEN "status" IS NULL THEN 'open'
      WHEN "status"::text IN ('open', 'reviewed', 'dismissed')
        THEN "status"::text
      ELSE 'open'
    END
  )::"report_status";--> statement-breakpoint

ALTER TABLE "seller_reports"
  ALTER COLUMN "status" SET DEFAULT 'open';--> statement-breakpoint

ALTER TABLE "seller_reports"
  ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "review_reports"
  ALTER COLUMN "status" TYPE "report_status"
  USING (
    CASE
      WHEN "status" IS NULL THEN 'open'
      WHEN "status"::text IN ('open', 'reviewed', 'dismissed')
        THEN "status"::text
      ELSE 'open'
    END
  )::"report_status";--> statement-breakpoint

ALTER TABLE "review_reports"
  ALTER COLUMN "status" SET DEFAULT 'open';--> statement-breakpoint

ALTER TABLE "review_reports"
  ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "reviews_seller_created_visible_idx"
  ON "reviews" ("seller_id", "created_at" DESC, "id" DESC)
  WHERE "is_hidden" = false;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "seller_reports_seller_reporter_idx"
  ON "seller_reports" ("seller_id", "reporter_user_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "review_reports_review_reporter_idx"
  ON "review_reports" ("review_id", "reporter_user_id");
