CREATE TABLE "fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"stage" text DEFAULT 'Group stage' NOT NULL,
	"team_a" text NOT NULL,
	"team_b" text NOT NULL,
	"score_a" integer,
	"score_b" integer,
	"scheduled_at" timestamp with time zone,
	"venue" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "background_file_id" uuid;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixtures_event_idx" ON "fixtures" USING btree ("event_id","display_order");--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_background_file_id_files_id_fk" FOREIGN KEY ("background_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;