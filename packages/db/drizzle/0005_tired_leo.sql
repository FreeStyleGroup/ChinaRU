CREATE TYPE "public"."job_category" AS ENUM('it', 'trade', 'teaching', 'marketing', 'manufacturing', 'logistics', 'finance', 'engineering', 'translation', 'management');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."resume_experience" AS ENUM('none', 'lt_1', '1_3', '3_6', 'gt_6');--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position" text NOT NULL,
	"category" "job_category",
	"salary" text,
	"experience" "resume_experience",
	"skills" text,
	"about" text,
	"hsk_level" integer,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "resumes_hsk_chk" CHECK ("resumes"."hsk_level" is null or "resumes"."hsk_level" between 1 and 6)
);
--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN "category" "job_category";--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN "moderation_status" "moderation_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "job_listings" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resumes_user_uidx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_moderation_idx" ON "resumes" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "resumes_category_idx" ON "resumes" USING btree ("category");--> statement-breakpoint
CREATE INDEX "job_listings_moderation_idx" ON "job_listings" USING btree ("moderation_status");--> statement-breakpoint
CREATE INDEX "job_listings_category_idx" ON "job_listings" USING btree ("category");