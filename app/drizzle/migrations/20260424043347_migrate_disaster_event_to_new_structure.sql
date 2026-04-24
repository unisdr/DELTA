-- Custom SQL migration file, put your code below! --

-- ============================================================
-- STEP 1: CREATE NEW NORMALIZED TABLES
-- ============================================================

-- Lookup table for response types
CREATE TABLE IF NOT EXISTS "response_type" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" text NOT NULL
);

-- Lookup table for assessment types
CREATE TABLE IF NOT EXISTS "assessment_type" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" text NOT NULL
);

-- Many-to-many: disaster event causes another disaster event
CREATE TABLE IF NOT EXISTS "disaster_causality" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "cause_disaster_id" uuid REFERENCES "disaster_event"("id") ON DELETE SET NULL,
    "effect_disaster_id" uuid REFERENCES "disaster_event"("id") ON DELETE SET NULL
);

-- Many-to-many: disaster event <-> hazardous event causality
CREATE TABLE IF NOT EXISTS "disaster_hazardous_causality" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid REFERENCES "disaster_event"("id") ON DELETE SET NULL,
    "hazardous_event_id" uuid REFERENCES "hazardous_event"("id") ON DELETE SET NULL,
    "cause_type" text NOT NULL CHECK ("cause_type" IN ('DE_CAUSE_HE', 'HE_CAUSE_DE'))
);

-- One-to-many: disaster event declarations
CREATE TABLE IF NOT EXISTS "disaster_event_declaration" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid REFERENCES "disaster_event"("id") ON DELETE CASCADE,
    "declaration_date" date,
    "description" text
);

-- One-to-many: disaster event responses
CREATE TABLE IF NOT EXISTS "disaster_event_response" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid REFERENCES "disaster_event"("id") ON DELETE CASCADE,
    "response_type_id" uuid REFERENCES "response_type"("id") ON DELETE SET NULL,
    "response_date" date,
    "description" text
);

-- One-to-many: disaster event assessments
CREATE TABLE IF NOT EXISTS "disaster_event_assessment" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid REFERENCES "disaster_event"("id") ON DELETE CASCADE,
    "assessment_type_id" uuid REFERENCES "assessment_type"("id") ON DELETE SET NULL,
    "assessment_date" date,
    "description" text
);

-- One-to-many: disaster event attachments (metadata only, files stay in storage)
CREATE TABLE IF NOT EXISTS "disaster_event_attachment" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid REFERENCES "disaster_event"("id") ON DELETE CASCADE,
    "title" text NOT NULL DEFAULT '',
    "file_key" text NOT NULL DEFAULT '',
    "file_name" text NOT NULL DEFAULT '',
    "file_type" text NOT NULL DEFAULT '',
    "file_size" bigint NOT NULL DEFAULT 0,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- One-to-one: disaster event geography (PostGIS)
CREATE TABLE IF NOT EXISTS "disaster_event_geography" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "disaster_event_id" uuid UNIQUE REFERENCES "disaster_event"("id") ON DELETE CASCADE,
    "geom" geometry(Geometry, 4326),
    "division_id" uuid REFERENCES "division"("id") ON DELETE SET NULL,
    "source" text NOT NULL DEFAULT 'manual' CHECK ("source" IN ('manual', 'derived_from_division')),
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- GIST index for geography geometry (drizzle-kit cannot emit USING GIST)
CREATE INDEX IF NOT EXISTS "disaster_event_geography_geom_idx"
    ON "disaster_event_geography" USING GIST ("geom");

-- FK indexes on new tables
CREATE INDEX IF NOT EXISTS "disaster_causality_cause_idx" ON "disaster_causality"("cause_disaster_id");
CREATE INDEX IF NOT EXISTS "disaster_causality_effect_idx" ON "disaster_causality"("effect_disaster_id");
CREATE INDEX IF NOT EXISTS "disaster_hazardous_causality_de_idx" ON "disaster_hazardous_causality"("disaster_event_id");
CREATE INDEX IF NOT EXISTS "disaster_hazardous_causality_he_idx" ON "disaster_hazardous_causality"("hazardous_event_id");
CREATE INDEX IF NOT EXISTS "disaster_event_declaration_de_idx" ON "disaster_event_declaration"("disaster_event_id");
CREATE INDEX IF NOT EXISTS "disaster_event_response_de_idx" ON "disaster_event_response"("disaster_event_id");
CREATE INDEX IF NOT EXISTS "disaster_event_assessment_de_idx" ON "disaster_event_assessment"("disaster_event_id");
CREATE INDEX IF NOT EXISTS "disaster_event_attachment_de_idx" ON "disaster_event_attachment"("disaster_event_id");

-- ============================================================
-- STEP 2: SEED LOOKUP TABLES
-- ============================================================

INSERT INTO "response_type" ("id", "type") VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 'Early Action'),
    ('a1b2c3d4-0001-0001-0001-000000000002', 'Response Operations'),
    ('a1b2c3d4-0001-0001-0001-000000000003', 'Other')
ON CONFLICT DO NOTHING;

INSERT INTO "assessment_type" ("id", "type") VALUES
    ('b2c3d4e5-0002-0002-0002-000000000001', 'Rapid / Preliminary Assessment'),
    ('b2c3d4e5-0002-0002-0002-000000000002', 'Post-Disaster Assessment'),
    ('b2c3d4e5-0002-0002-0002-000000000003', 'Other Assessment')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 3: DROP OLD FK CONSTRAINTS FROM disaster_event
-- ============================================================

ALTER TABLE "disaster_event"
    DROP CONSTRAINT IF EXISTS "disaster_event_disaster_event_id_disaster_event_id_fk";

ALTER TABLE "disaster_event"
    DROP CONSTRAINT IF EXISTS "disaster_event_hazardous_event_id_hazardous_event_id_fk";

ALTER TABLE "disaster_event"
    DROP CONSTRAINT IF EXISTS "disaster_event_id_event_id_fk";

-- ============================================================
-- STEP 4: GIVE disaster_event.id A DEFAULT UUID GENERATOR
-- ============================================================

ALTER TABLE "disaster_event"
    ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ============================================================
-- STEP 5: ADD STAGING DATE COLUMNS
-- ============================================================

ALTER TABLE "disaster_event"
    ADD COLUMN IF NOT EXISTS "start_date_new" date,
    ADD COLUMN IF NOT EXISTS "end_date_new" date;

-- ============================================================
-- STEP 6: BACKFILL DATA INTO NEW TABLES
-- ============================================================

-- 6a. Hazardous event causality (existing hazardous_event_id links → HE_CAUSE_DE)
INSERT INTO "disaster_hazardous_causality" ("disaster_event_id", "hazardous_event_id", "cause_type")
SELECT "id", "hazardous_event_id", 'HE_CAUSE_DE'
FROM "disaster_event"
WHERE "hazardous_event_id" IS NOT NULL;

-- 6b. Self-causality (existing disaster_event_id links)
INSERT INTO "disaster_causality" ("cause_disaster_id", "effect_disaster_id")
SELECT "disaster_event_id", "id"
FROM "disaster_event"
WHERE "disaster_event_id" IS NOT NULL;

-- 6c. Disaster declarations (groups 1-5) → disaster_event_declaration
INSERT INTO "disaster_event_declaration" ("disaster_event_id", "declaration_date", "description")
SELECT "id", "disaster_declaration_date1"::date, "disaster_declaration_type_and_effect1"
FROM "disaster_event"
WHERE "disaster_declaration_type_and_effect1" IS NOT NULL
  AND "disaster_declaration_type_and_effect1" <> '';

INSERT INTO "disaster_event_declaration" ("disaster_event_id", "declaration_date", "description")
SELECT "id", "disaster_declaration_date2"::date, "disaster_declaration_type_and_effect2"
FROM "disaster_event"
WHERE "disaster_declaration_type_and_effect2" IS NOT NULL
  AND "disaster_declaration_type_and_effect2" <> '';

INSERT INTO "disaster_event_declaration" ("disaster_event_id", "declaration_date", "description")
SELECT "id", "disaster_declaration_date3"::date, "disaster_declaration_type_and_effect3"
FROM "disaster_event"
WHERE "disaster_declaration_type_and_effect3" IS NOT NULL
  AND "disaster_declaration_type_and_effect3" <> '';

INSERT INTO "disaster_event_declaration" ("disaster_event_id", "declaration_date", "description")
SELECT "id", "disaster_declaration_date4"::date, "disaster_declaration_type_and_effect4"
FROM "disaster_event"
WHERE "disaster_declaration_type_and_effect4" IS NOT NULL
  AND "disaster_declaration_type_and_effect4" <> '';

INSERT INTO "disaster_event_declaration" ("disaster_event_id", "declaration_date", "description")
SELECT "id", "disaster_declaration_date5"::date, "disaster_declaration_type_and_effect5"
FROM "disaster_event"
WHERE "disaster_declaration_type_and_effect5" IS NOT NULL
  AND "disaster_declaration_type_and_effect5" <> '';

-- 6d. Early actions (groups 1-5) → disaster_event_response (type: Early Action)
INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000001'::uuid, "early_action_date1"::date, "early_action_description1"
FROM "disaster_event"
WHERE "early_action_description1" IS NOT NULL AND "early_action_description1" <> '';

INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000001'::uuid, "early_action_date2"::date, "early_action_description2"
FROM "disaster_event"
WHERE "early_action_description2" IS NOT NULL AND "early_action_description2" <> '';

INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000001'::uuid, "early_action_date3"::date, "early_action_description3"
FROM "disaster_event"
WHERE "early_action_description3" IS NOT NULL AND "early_action_description3" <> '';

INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000001'::uuid, "early_action_date4"::date, "early_action_description4"
FROM "disaster_event"
WHERE "early_action_description4" IS NOT NULL AND "early_action_description4" <> '';

INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000001'::uuid, "early_action_date5"::date, "early_action_description5"
FROM "disaster_event"
WHERE "early_action_description5" IS NOT NULL AND "early_action_description5" <> '';

-- 6e. Response operations → disaster_event_response (type: Response Operations)
INSERT INTO "disaster_event_response" ("disaster_event_id", "response_type_id", "response_date", "description")
SELECT "id", 'a1b2c3d4-0001-0001-0001-000000000002'::uuid, NULL,
    CASE
        WHEN "response_oprations" <> '' AND "response_operations_description" <> ''
            THEN "response_oprations" || E'\n' || "response_operations_description"
        WHEN "response_oprations" <> '' THEN "response_oprations"
        WHEN "response_operations_description" <> '' THEN "response_operations_description"
        ELSE NULL
    END
FROM "disaster_event"
WHERE ("response_oprations" IS NOT NULL AND "response_oprations" <> '')
   OR ("response_operations_description" IS NOT NULL AND "response_operations_description" <> '');

-- 6f. Rapid/preliminary assessments (groups 1-5) → disaster_event_assessment
INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000001'::uuid, "rapid_or_preliminary_assessment_date1"::date, "rapid_or_preliminary_assesment_description1"
FROM "disaster_event"
WHERE "rapid_or_preliminary_assesment_description1" IS NOT NULL AND "rapid_or_preliminary_assesment_description1" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000001'::uuid, "rapid_or_preliminary_assessment_date2"::date, "rapid_or_preliminary_assesment_description2"
FROM "disaster_event"
WHERE "rapid_or_preliminary_assesment_description2" IS NOT NULL AND "rapid_or_preliminary_assesment_description2" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000001'::uuid, "rapid_or_preliminary_assessment_date3"::date, "rapid_or_preliminary_assesment_description3"
FROM "disaster_event"
WHERE "rapid_or_preliminary_assesment_description3" IS NOT NULL AND "rapid_or_preliminary_assesment_description3" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000001'::uuid, "rapid_or_preliminary_assessment_date4"::date, "rapid_or_preliminary_assesment_description4"
FROM "disaster_event"
WHERE "rapid_or_preliminary_assesment_description4" IS NOT NULL AND "rapid_or_preliminary_assesment_description4" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000001'::uuid, "rapid_or_preliminary_assessment_date5"::date, "rapid_or_preliminary_assesment_description5"
FROM "disaster_event"
WHERE "rapid_or_preliminary_assesment_description5" IS NOT NULL AND "rapid_or_preliminary_assesment_description5" <> '';

-- 6g. Post-disaster assessments (groups 1-5) → disaster_event_assessment
INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000002'::uuid, "post_disaster_assessment_date1"::date, "post_disaster_assessment_description1"
FROM "disaster_event"
WHERE "post_disaster_assessment_description1" IS NOT NULL AND "post_disaster_assessment_description1" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000002'::uuid, "post_disaster_assessment_date2"::date, "post_disaster_assessment_description2"
FROM "disaster_event"
WHERE "post_disaster_assessment_description2" IS NOT NULL AND "post_disaster_assessment_description2" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000002'::uuid, "post_disaster_assessment_date3"::date, "post_disaster_assessment_description3"
FROM "disaster_event"
WHERE "post_disaster_assessment_description3" IS NOT NULL AND "post_disaster_assessment_description3" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000002'::uuid, "post_disaster_assessment_date4"::date, "post_disaster_assessment_description4"
FROM "disaster_event"
WHERE "post_disaster_assessment_description4" IS NOT NULL AND "post_disaster_assessment_description4" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000002'::uuid, "post_disaster_assessment_date5"::date, "post_disaster_assessment_description5"
FROM "disaster_event"
WHERE "post_disaster_assessment_description5" IS NOT NULL AND "post_disaster_assessment_description5" <> '';

-- 6h. Other assessments (groups 1-5) → disaster_event_assessment
INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000003'::uuid, "other_assessment_date1"::date, "other_assessment_description1"
FROM "disaster_event"
WHERE "other_assessment_description1" IS NOT NULL AND "other_assessment_description1" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000003'::uuid, "other_assessment_date2"::date, "other_assessment_description2"
FROM "disaster_event"
WHERE "other_assessment_description2" IS NOT NULL AND "other_assessment_description2" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000003'::uuid, "other_assessment_date3"::date, "other_assessment_description3"
FROM "disaster_event"
WHERE "other_assessment_description3" IS NOT NULL AND "other_assessment_description3" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000003'::uuid, "other_assessment_date4"::date, "other_assessment_description4"
FROM "disaster_event"
WHERE "other_assessment_description4" IS NOT NULL AND "other_assessment_description4" <> '';

INSERT INTO "disaster_event_assessment" ("disaster_event_id", "assessment_type_id", "assessment_date", "description")
SELECT "id", 'b2c3d4e5-0002-0002-0002-000000000003'::uuid, "other_assessment_date5"::date, "other_assessment_description5"
FROM "disaster_event"
WHERE "other_assessment_description5" IS NOT NULL AND "other_assessment_description5" <> '';

-- 6i. Attachments JSON → disaster_event_attachment rows
-- attachments column stores a JSONB array of objects with fields: title, file, tenantPath
-- file object contains: name (file_key), originalName (file_name), mimeType (file_type), size (file_size)
INSERT INTO "disaster_event_attachment" (
    "disaster_event_id", "title", "file_key", "file_name", "file_type", "file_size"
)
SELECT
    de."id",
    COALESCE(att->>'title', ''),
    COALESCE(att->'file'->>'name', ''),
    COALESCE(att->'file'->>'originalName', att->'file'->>'name', ''),
    COALESCE(att->'file'->>'mimeType', ''),
    COALESCE((att->'file'->>'size')::bigint, 0)
FROM "disaster_event" de,
     jsonb_array_elements(
         CASE
             WHEN jsonb_typeof(de."attachments") = 'array' THEN de."attachments"
             ELSE '[]'::jsonb
         END
     ) AS att
WHERE de."attachments" IS NOT NULL
  AND jsonb_typeof(de."attachments") = 'array'
  AND jsonb_array_length(de."attachments") > 0;

-- 6j. Spatial footprint → disaster_event_geography
-- spatial_footprint is stored as a GeoJSON-like JSONB; attempt ST_GeomFromGeoJSON conversion,
-- fall back to null geom (row still created to preserve the record association)
INSERT INTO "disaster_event_geography" ("disaster_event_id", "geom", "source")
SELECT
    de."id",
    CASE
        WHEN de."spatial_footprint" IS NOT NULL
         AND de."spatial_footprint" ? 'type'
        THEN (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(de."spatial_footprint"::text), 4326)
        )
        ELSE NULL
    END,
    'manual'
FROM "disaster_event" de
WHERE de."spatial_footprint" IS NOT NULL;

-- ============================================================
-- STEP 7: CONVERT start_date / end_date TEXT → DATE
-- ============================================================

-- start_date conversion rules:
--   null/empty            → NULL
--   YYYY                  → YYYY-01-01
--   YYYY-MM               → first day of that month
--   YYYY-MM-DD            → direct cast
UPDATE "disaster_event" SET "start_date_new" =
    CASE
        WHEN "start_date" IS NULL OR "start_date" = '' THEN NULL
        WHEN "start_date" ~ '^\d{4}$'
            THEN to_date("start_date", 'YYYY')
        WHEN "start_date" ~ '^\d{4}-\d{2}$'
            THEN to_date("start_date" || '-01', 'YYYY-MM-DD')
        WHEN "start_date" ~ '^\d{4}-\d{2}-\d{2}$'
            THEN "start_date"::date
        ELSE NULL
    END;

-- end_date conversion rules:
--   null/empty            → NULL
--   YYYY                  → YYYY-12-31
--   YYYY-MM               → last day of that month
--   YYYY-MM-DD            → direct cast
UPDATE "disaster_event" SET "end_date_new" =
    CASE
        WHEN "end_date" IS NULL OR "end_date" = '' THEN NULL
        WHEN "end_date" ~ '^\d{4}$'
            THEN to_date("end_date" || '-12-31', 'YYYY-MM-DD')
        WHEN "end_date" ~ '^\d{4}-\d{2}$'
            THEN (date_trunc('month', to_date("end_date" || '-01', 'YYYY-MM-DD')) + interval '1 month' - interval '1 day')::date
        WHEN "end_date" ~ '^\d{4}-\d{2}-\d{2}$'
            THEN "end_date"::date
        ELSE NULL
    END;

-- ============================================================
-- STEP 8: DROP DEPRECATED COLUMNS FROM disaster_event
-- ============================================================

ALTER TABLE "disaster_event"
    DROP COLUMN IF EXISTS "api_import_id",
    DROP COLUMN IF EXISTS "hazardous_event_id",
    DROP COLUMN IF EXISTS "disaster_event_id",
    DROP COLUMN IF EXISTS "other_id1",
    DROP COLUMN IF EXISTS "other_id2",
    DROP COLUMN IF EXISTS "other_id3",
    DROP COLUMN IF EXISTS "start_date",
    DROP COLUMN IF EXISTS "end_date",
    DROP COLUMN IF EXISTS "start_date_local",
    DROP COLUMN IF EXISTS "end_date_local",
    DROP COLUMN IF EXISTS "duration_days",
    DROP COLUMN IF EXISTS "disaster_declaration",
    DROP COLUMN IF EXISTS "disaster_declaration_type_and_effect1",
    DROP COLUMN IF EXISTS "disaster_declaration_date1",
    DROP COLUMN IF EXISTS "disaster_declaration_type_and_effect2",
    DROP COLUMN IF EXISTS "disaster_declaration_date2",
    DROP COLUMN IF EXISTS "disaster_declaration_type_and_effect3",
    DROP COLUMN IF EXISTS "disaster_declaration_date3",
    DROP COLUMN IF EXISTS "disaster_declaration_type_and_effect4",
    DROP COLUMN IF EXISTS "disaster_declaration_date4",
    DROP COLUMN IF EXISTS "disaster_declaration_type_and_effect5",
    DROP COLUMN IF EXISTS "disaster_declaration_date5",
    DROP COLUMN IF EXISTS "had_official_warning_or_weather_advisory",
    DROP COLUMN IF EXISTS "official_warning_affected_areas",
    DROP COLUMN IF EXISTS "early_action_description1",
    DROP COLUMN IF EXISTS "early_action_date1",
    DROP COLUMN IF EXISTS "early_action_description2",
    DROP COLUMN IF EXISTS "early_action_date2",
    DROP COLUMN IF EXISTS "early_action_description3",
    DROP COLUMN IF EXISTS "early_action_date3",
    DROP COLUMN IF EXISTS "early_action_description4",
    DROP COLUMN IF EXISTS "early_action_date4",
    DROP COLUMN IF EXISTS "early_action_description5",
    DROP COLUMN IF EXISTS "early_action_date5",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assesment_description1",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assessment_date1",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assesment_description2",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assessment_date2",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assesment_description3",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assessment_date3",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assesment_description4",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assessment_date4",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assesment_description5",
    DROP COLUMN IF EXISTS "rapid_or_preliminary_assessment_date5",
    DROP COLUMN IF EXISTS "response_oprations",
    DROP COLUMN IF EXISTS "post_disaster_assessment_description1",
    DROP COLUMN IF EXISTS "post_disaster_assessment_date1",
    DROP COLUMN IF EXISTS "post_disaster_assessment_description2",
    DROP COLUMN IF EXISTS "post_disaster_assessment_date2",
    DROP COLUMN IF EXISTS "post_disaster_assessment_description3",
    DROP COLUMN IF EXISTS "post_disaster_assessment_date3",
    DROP COLUMN IF EXISTS "post_disaster_assessment_description4",
    DROP COLUMN IF EXISTS "post_disaster_assessment_date4",
    DROP COLUMN IF EXISTS "post_disaster_assessment_description5",
    DROP COLUMN IF EXISTS "post_disaster_assessment_date5",
    DROP COLUMN IF EXISTS "other_assessment_description1",
    DROP COLUMN IF EXISTS "other_assessment_date1",
    DROP COLUMN IF EXISTS "other_assessment_description2",
    DROP COLUMN IF EXISTS "other_assessment_date2",
    DROP COLUMN IF EXISTS "other_assessment_description3",
    DROP COLUMN IF EXISTS "other_assessment_date3",
    DROP COLUMN IF EXISTS "other_assessment_description4",
    DROP COLUMN IF EXISTS "other_assessment_date4",
    DROP COLUMN IF EXISTS "other_assessment_description5",
    DROP COLUMN IF EXISTS "other_assessment_date5",
    DROP COLUMN IF EXISTS "data_source",
    DROP COLUMN IF EXISTS "effects_total_usd",
    DROP COLUMN IF EXISTS "non_economic_losses",
    DROP COLUMN IF EXISTS "damages_subtotal_local_currency",
    DROP COLUMN IF EXISTS "losses_subtotal_usd",
    DROP COLUMN IF EXISTS "response_operations_description",
    DROP COLUMN IF EXISTS "response_operations_costs_local_currency",
    DROP COLUMN IF EXISTS "response_cost_total_local_currency",
    DROP COLUMN IF EXISTS "response_cost_total_usd",
    DROP COLUMN IF EXISTS "humanitarian_needs_description",
    DROP COLUMN IF EXISTS "humanitarian_needs_local_currency",
    DROP COLUMN IF EXISTS "humanitarian_needs_usd",
    DROP COLUMN IF EXISTS "rehabilitation_costs_local_currency_calc",
    DROP COLUMN IF EXISTS "rehabilitation_costs_local_currency_override",
    DROP COLUMN IF EXISTS "repair_costs_local_currency_calc",
    DROP COLUMN IF EXISTS "repair_costs_local_currency_override",
    DROP COLUMN IF EXISTS "replacement_costs_local_currency_calc",
    DROP COLUMN IF EXISTS "replacement_costs_local_currency_override",
    DROP COLUMN IF EXISTS "recovery_needs_local_currency_calc",
    DROP COLUMN IF EXISTS "recovery_needs_local_currency_override",
    DROP COLUMN IF EXISTS "attachments",
    DROP COLUMN IF EXISTS "spatial_footprint",
    DROP COLUMN IF EXISTS "legacy_data";

-- Drop the obsolete api_import_id tenant unique constraint (column already dropped above)
ALTER TABLE "disaster_event"
    DROP CONSTRAINT IF EXISTS "disaster_event_api_import_id_tenant_unique";

-- ============================================================
-- STEP 9: RENAME STAGING DATE COLUMNS TO FINAL NAMES
-- ============================================================

ALTER TABLE "disaster_event"
    RENAME COLUMN "start_date_new" TO "start_date";

ALTER TABLE "disaster_event"
    RENAME COLUMN "end_date_new" TO "end_date";
