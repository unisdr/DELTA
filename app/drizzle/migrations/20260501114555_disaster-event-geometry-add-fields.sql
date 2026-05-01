-- Custom SQL migration file, put your code below! --
ALTER TABLE "disaster_event_geometry" RENAME COLUMN "geom" TO "geometry";
ALTER TABLE "disaster_event_geometry" ADD COLUMN "geometry_type" text;
ALTER TABLE "disaster_event_geometry" ADD COLUMN "name" text;
ALTER TABLE "disaster_event_geometry" ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false;
ALTER TABLE "disaster_event_geometry" ADD COLUMN "valid_from" timestamp;
ALTER TABLE "disaster_event_geometry" ADD COLUMN "valid_to" timestamp;