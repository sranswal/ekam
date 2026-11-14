CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_id" integer NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text,
	"category" text,
	"job_type" text,
	"salary_min" integer,
	"salary_max" integer,
	"publication_date" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source_url" text NOT NULL,
	"source_name" text DEFAULT 'Remotive' NOT NULL,
	"dedupe_key" text NOT NULL,
	"incomplete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_id" integer NOT NULL,
	"stage" text NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt" text NOT NULL,
	"interpreted" jsonb,
	"status" text DEFAULT 'running' NOT NULL,
	"collected" integer DEFAULT 0 NOT NULL,
	"kept" integer DEFAULT 0 NOT NULL,
	"duplicates" integer DEFAULT 0 NOT NULL,
	"flagged" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_query_id_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_events" ADD CONSTRAINT "pipeline_events_query_id_queries_id_fk" FOREIGN KEY ("query_id") REFERENCES "public"."queries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listings_query_idx" ON "listings" USING btree ("query_id");--> statement-breakpoint
CREATE INDEX "events_query_idx" ON "pipeline_events" USING btree ("query_id");