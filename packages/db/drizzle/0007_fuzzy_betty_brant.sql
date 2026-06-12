CREATE TYPE "public"."article_section" AS ENUM('horoscope', 'auto', 'stocks', 'travel', 'jobs', 'tenders', 'freight', 'education', 'metro', 'general');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" "article_section" NOT NULL,
	"agent_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	"cover_image_url" text,
	"image_prompt" text,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"source" text,
	"author_name" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" "article_section" NOT NULL,
	"name" text NOT NULL,
	"persona" text NOT NULL,
	"model" text,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_agent_id_content_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."content_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_slug_uidx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "articles_section_idx" ON "articles" USING btree ("section");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_agents_section_uidx" ON "content_agents" USING btree ("section");