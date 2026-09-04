DO $$ BEGIN
 CREATE TYPE "contact_status" AS ENUM('unread', 'read', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(50),
  "message" text NOT NULL,
  "status" "contact_status" DEFAULT 'unread' NOT NULL,
  "admin_notes" text,
  "resolved_by_admin_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "contacts_status_idx" ON "contacts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_created_at_idx" ON "contacts" ("created_at");
