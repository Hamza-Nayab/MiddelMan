-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"related_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications" ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","is_read");
