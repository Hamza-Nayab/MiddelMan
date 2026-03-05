-- Rename instagram_handle column to contact_email and update constraints
-- First, drop the existing unique constraint on instagram_handle
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_instagram_handle_unique";

-- Rename the column
ALTER TABLE "profiles" RENAME COLUMN "instagram_handle" TO "contact_email";

-- Alter the column to allow email format (up to 254 chars for email addresses)
ALTER TABLE "profiles" ALTER COLUMN "contact_email" TYPE varchar(254);

-- Add the unique constraint back
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_contact_email_unique" UNIQUE ("contact_email");
