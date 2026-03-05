CREATE TYPE "public"."admin_action" AS ENUM('DISABLE_USER', 'ENABLE_USER', 'PROMOTE_ADMIN', 'DEMOTE_ADMIN', 'HIDE_REVIEW', 'UNHIDE_REVIEW', 'RESOLVE_DISPUTE', 'DELETE_DISPUTE_EVIDENCE');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'resolved_valid', 'resolved_rejected');--> statement-breakpoint
CREATE TYPE "public"."profile_theme" AS ENUM('light', 'dark', 'gradient');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('buyer', 'seller', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('none', 'ig_bio_code', 'whatsapp_otp', 'manual');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"action" "admin_action" NOT NULL,
	"target_user_id" integer,
	"target_review_id" integer,
	"target_dispute_id" integer,
	"details" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"icon" varchar(30),
	"title" varchar(40) NOT NULL,
	"url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_daily_stats" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_daily_stats_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" integer NOT NULL,
	"display_name" varchar(50) NOT NULL,
	"bio" varchar(160),
	"avatar_url" text,
	"instagram_handle" varchar(30),
	"whatsapp_number" varchar(20),
	"phone_number" varchar(20),
	"country_code" varchar(2) DEFAULT 'US',
	"is_verified" boolean DEFAULT false NOT NULL,
	"verification_method" "verification_method" DEFAULT 'none' NOT NULL,
	"theme" "profile_theme" DEFAULT 'light' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_instagram_handle_unique" UNIQUE("instagram_handle")
);
--> statement-breakpoint
CREATE TABLE "review_disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"reason" varchar NOT NULL,
	"message" text,
	"evidence_url" text,
	"evidence_mime" text,
	"evidence_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_admin_id" integer,
	"resolution_note" text,
	"deleted_evidence_at" timestamp with time zone,
	CONSTRAINT "review_disputes_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"reviewer_user_id" integer,
	"author_name" varchar(50) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"ip_hash" text,
	"user_agent_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(20) NOT NULL,
	"email" text,
	"password_hash" text,
	"google_id" text,
	"role" "user_role" DEFAULT 'buyer' NOT NULL,
	"last_username_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"disabled_reason" text,
	"disabled_at" timestamp with time zone,
	"disabled_by_admin_id" integer,
	"is_master_admin" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_review_id_reviews_id_fk" FOREIGN KEY ("target_review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_daily_stats" ADD CONSTRAINT "profile_daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_disputes" ADD CONSTRAINT "review_disputes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_disputes" ADD CONSTRAINT "review_disputes_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_disputes" ADD CONSTRAINT "review_disputes_resolved_by_admin_id_users_id_fk" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_disabled_by_admin_id_users_id_fk" FOREIGN KEY ("disabled_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_created_idx" ON "admin_audit_logs" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "links_user_active_sort_idx" ON "links" USING btree ("user_id","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "profile_daily_stats_user_day_idx" ON "profile_daily_stats" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "review_disputes_status_created_idx" ON "review_disputes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reviews_seller_created_idx" ON "reviews" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_seller_hidden_created_idx" ON "reviews" USING btree ("seller_id","is_hidden","created_at");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_created_idx" ON "reviews" USING btree ("reviewer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "reviews_ip_seller_created_idx" ON "reviews" USING btree ("ip_hash","seller_id","created_at");