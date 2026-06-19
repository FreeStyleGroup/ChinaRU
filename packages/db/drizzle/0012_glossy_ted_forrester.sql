CREATE TYPE "public"."vehicle_type" AS ENUM('auto', 'moto', 'special');--> statement-breakpoint
CREATE TABLE "dealer_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dealers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"region" text,
	"address" text NOT NULL,
	"phone" text,
	"website" text,
	"lat" numeric(9, 6) NOT NULL,
	"lng" numeric(9, 6) NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "garage_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"model_id" uuid,
	"model_name" text NOT NULL,
	"type" "vehicle_type" DEFAULT 'auto' NOT NULL,
	"year" integer,
	"vin" text,
	"plate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_fitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"model_id" uuid
);
--> statement-breakpoint
CREATE TABLE "vehicle_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"country" text DEFAULT 'CN' NOT NULL,
	"types" text[] DEFAULT '{auto}'::text[] NOT NULL,
	"logo_url" text,
	"popular" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "vehicle_type" DEFAULT 'auto' NOT NULL,
	"body_type" text,
	"year_from" integer,
	"year_to" integer,
	"image_url" text,
	"sort" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dealer_brands" ADD CONSTRAINT "dealer_brands_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_brands" ADD CONSTRAINT "dealer_brands_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garage_vehicles" ADD CONSTRAINT "garage_vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garage_vehicles" ADD CONSTRAINT "garage_vehicles_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garage_vehicles" ADD CONSTRAINT "garage_vehicles_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_model_id_vehicle_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_brand_id_vehicle_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dealer_brands_uidx" ON "dealer_brands" USING btree ("dealer_id","brand_id");--> statement-breakpoint
CREATE INDEX "dealer_brands_dealer_idx" ON "dealer_brands" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "dealer_brands_brand_idx" ON "dealer_brands" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "dealers_city_idx" ON "dealers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "garage_vehicles_user_idx" ON "garage_vehicles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_fitments_product_idx" ON "product_fitments" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_fitments_brand_idx" ON "product_fitments" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "product_fitments_model_idx" ON "product_fitments" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_brands_slug_uidx" ON "vehicle_brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vehicle_brands_popular_idx" ON "vehicle_brands" USING btree ("popular");--> statement-breakpoint
CREATE INDEX "vehicle_brands_sort_idx" ON "vehicle_brands" USING btree ("sort");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_models_brand_slug_uidx" ON "vehicle_models" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE INDEX "vehicle_models_brand_idx" ON "vehicle_models" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "vehicle_models_type_idx" ON "vehicle_models" USING btree ("type");