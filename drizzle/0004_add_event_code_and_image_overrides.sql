ALTER TABLE "events" ADD COLUMN "event_code" text UNIQUE;

CREATE TABLE "image_scene_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"speaker_name" text,
	"topic" text,
	"stance" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "image_scene_overrides" ADD CONSTRAINT "image_scene_overrides_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "image_scene_overrides_scene_idx" ON "image_scene_overrides" USING btree ("scene_id");