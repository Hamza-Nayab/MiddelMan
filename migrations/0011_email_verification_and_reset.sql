ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false;--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "verification_token" text;--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "verification_token_expires" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "reset_token" text;--> statement-breakpoint

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "reset_token_expires" timestamp with time zone;--> statement-breakpoint