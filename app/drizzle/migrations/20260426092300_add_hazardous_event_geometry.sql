CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE "public"."hazardous_event_geometry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hazardous_event_id" uuid NOT NULL,
	"geometry" geometry(GEOMETRY,4326) NOT NULL,
	"geometry_type" text NOT NULL,
	"name" text,
	"source" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp,
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "hazardous_event_geometry_geometry_type_chk" CHECK (
		"geometry_type" IN ('POINT', 'LINESTRING', 'POLYGON', 'MULTIPOLYGON')
	)
);

ALTER TABLE "public"."hazardous_event_geometry"
	ADD CONSTRAINT "hazardous_event_geometry_hazardous_event_id_hazardous_event_id_fk"
	FOREIGN KEY ("hazardous_event_id")
	REFERENCES "public"."hazardous_event"("id")
	ON DELETE CASCADE
	ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "hazardous_event_geometry_one_primary_per_event_idx"
	ON "public"."hazardous_event_geometry" ("hazardous_event_id")
	WHERE "is_primary" = true;

CREATE INDEX "hazardous_event_geometry_geometry_gist_idx"
	ON "public"."hazardous_event_geometry"
	USING GIST ("geometry");
