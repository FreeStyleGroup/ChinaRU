CREATE TYPE "public"."resume_document_type" AS ENUM('diploma', 'certificate', 'hsk_certificate', 'reference', 'other');--> statement-breakpoint
CREATE TABLE "resume_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"type" "resume_document_type" DEFAULT 'other' NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resume_documents_size_chk" CHECK ("resume_documents"."size_bytes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_resume_id_resumes_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resume_documents_resume_idx" ON "resume_documents" USING btree ("resume_id");