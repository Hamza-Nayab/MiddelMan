-- Add profile customization columns
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "background_preset" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "gradient_preset" varchar(20);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "accent_color" varchar(7);
