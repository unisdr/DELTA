-- Step 1: Rename table and dependent objects
ALTER TABLE "disaster_event_geography" RENAME TO "disaster_event_geometry";

-- Step 2: Drop legacy columns from disaster_event_geometry
ALTER TABLE "disaster_event_geometry" DROP CONSTRAINT IF EXISTS "disaster_event_geography_division_id_fkey";
ALTER TABLE "disaster_event_geometry" DROP COLUMN IF EXISTS "division_id";
ALTER TABLE "disaster_event_geometry" DROP COLUMN IF EXISTS "source";

-- Step 3: Drop source from hazardous_event_geometry
ALTER TABLE "hazardous_event_geometry" DROP COLUMN IF EXISTS "source";

-- Step 4: Create hazardous_event_division join table
CREATE TABLE "hazardous_event_division" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"hazardous_event_id" uuid NOT NULL REFERENCES "hazardous_event" ("id") ON DELETE CASCADE,
	"division_id" uuid NOT NULL REFERENCES "division" ("id") ON DELETE CASCADE,
	"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "hazardous_event_division_unique_pair" UNIQUE ("hazardous_event_id", "division_id")
);

CREATE INDEX "hazardous_event_division_hazardous_event_id_idx" ON "hazardous_event_division" ("hazardous_event_id");
CREATE INDEX "hazardous_event_division_division_id_idx" ON "hazardous_event_division" ("division_id");

-- Step 5: Create disaster_event_division join table
CREATE TABLE "disaster_event_division" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"disaster_event_id" uuid NOT NULL REFERENCES "disaster_event" ("id") ON DELETE CASCADE,
	"division_id" uuid NOT NULL REFERENCES "division" ("id") ON DELETE CASCADE,
	"created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "disaster_event_division_unique_pair" UNIQUE ("disaster_event_id", "division_id")
);

CREATE INDEX "disaster_event_division_disaster_event_id_idx" ON "disaster_event_division" ("disaster_event_id");
CREATE INDEX "disaster_event_division_division_id_idx" ON "disaster_event_division" ("division_id");

