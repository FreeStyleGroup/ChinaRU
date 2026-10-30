CREATE TYPE "public"."price_request_status" AS ENUM('new', 'answered', 'closed');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'price_request';--> statement-breakpoint
CREATE TABLE "price_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"comment" text,
	"contact_phone" text,
	"status" "price_request_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_requests_qty_positive" CHECK ("price_requests"."qty" > 0)
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description_ru" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description_en" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "description_zh" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "specs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_seller_id_seller_profiles_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."seller_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_requests" ADD CONSTRAINT "price_requests_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_requests_seller_idx" ON "price_requests" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "price_requests_buyer_idx" ON "price_requests" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "price_requests_product_idx" ON "price_requests" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_requests_open_uidx" ON "price_requests" USING btree ("buyer_id","product_id") WHERE "price_requests"."status" = 'new';