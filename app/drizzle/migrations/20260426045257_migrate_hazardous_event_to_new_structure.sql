-- Custom SQL migration file, put your code below! ---- Custom SQL migration for hazardous event refactor

-- 1) Decouple hazardous_event.id from event.id and remove old FK.
ALTER TABLE "hazardous_event"
	DROP CONSTRAINT IF EXISTS "hazardous_event_id_event_id_fk";

ALTER TABLE "hazardous_event"
	ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- 2) Remove API import uniqueness and deprecated columns.
ALTER TABLE "hazardous_event"
	DROP CONSTRAINT IF EXISTS "hazardous_event_api_import_id_tenant_unique";

DROP INDEX IF EXISTS "hazardous_event_api_import_id_tenant_unique";

ALTER TABLE "hazardous_event"
	DROP COLUMN IF EXISTS "api_import_id",
	DROP COLUMN IF EXISTS "status",
	DROP COLUMN IF EXISTS "spatial_footprint";

-- 3) Convert start_date/end_date from flexible TEXT to DATE using staged columns.
ALTER TABLE "hazardous_event"
	ADD COLUMN IF NOT EXISTS "start_date_new" date,
	ADD COLUMN IF NOT EXISTS "end_date_new" date;

UPDATE "hazardous_event"
SET "start_date_new" = CASE
	WHEN "start_date" IS NULL OR btrim("start_date") = '' THEN NULL
	WHEN "start_date" ~ '^\d{4}$' THEN to_date("start_date", 'YYYY')
	WHEN "start_date" ~ '^\d{4}-\d{2}$' THEN to_date("start_date" || '-01', 'YYYY-MM-DD')
	WHEN "start_date" ~ '^\d{4}-\d{2}-\d{2}$' THEN "start_date"::date
	ELSE NULL
END;

UPDATE "hazardous_event"
SET "end_date_new" = CASE
	WHEN "end_date" IS NULL OR btrim("end_date") = '' THEN NULL
	WHEN "end_date" ~ '^\d{4}$' THEN to_date("end_date" || '-12-31', 'YYYY-MM-DD')
	WHEN "end_date" ~ '^\d{4}-\d{2}$' THEN (
		date_trunc('month', to_date("end_date" || '-01', 'YYYY-MM-DD'))
		+ interval '1 month' - interval '1 day'
	)::date
	WHEN "end_date" ~ '^\d{4}-\d{2}-\d{2}$' THEN "end_date"::date
	ELSE NULL
END;

ALTER TABLE "hazardous_event"
	DROP COLUMN IF EXISTS "start_date",
	DROP COLUMN IF EXISTS "end_date";

ALTER TABLE "hazardous_event"
	RENAME COLUMN "start_date_new" TO "start_date";

ALTER TABLE "hazardous_event"
	RENAME COLUMN "end_date_new" TO "end_date";

-- 4) Create hazard-to-hazard causality table.
CREATE TABLE IF NOT EXISTS "hazard_causality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cause_hazardous_event_id" uuid,
	"effect_hazardous_event_id" uuid,
	CONSTRAINT "hazard_causality_cause_hazardous_event_id_hazardous_event_id_fk"
		FOREIGN KEY ("cause_hazardous_event_id")
		REFERENCES "public"."hazardous_event"("id")
		ON DELETE set null ON UPDATE no action,
	CONSTRAINT "hazard_causality_effect_hazardous_event_id_hazardous_event_id_fk"
		FOREIGN KEY ("effect_hazardous_event_id")
		REFERENCES "public"."hazardous_event"("id")
		ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "hazard_causality_cause_idx"
	ON "hazard_causality" ("cause_hazardous_event_id");

CREATE INDEX IF NOT EXISTS "hazard_causality_effect_idx"
	ON "hazard_causality" ("effect_hazardous_event_id");

CREATE UNIQUE INDEX IF NOT EXISTS "hazard_causality_unique_pair_idx"
	ON "hazard_causality" ("cause_hazardous_event_id", "effect_hazardous_event_id")
	WHERE "cause_hazardous_event_id" IS NOT NULL
		AND "effect_hazardous_event_id" IS NOT NULL;

-- 5) Create normalized hazardous event attachments table.
CREATE TABLE IF NOT EXISTS "hazardous_event_attachment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hazardous_event_id" uuid,
	"title" text NOT NULL DEFAULT '',
	"file_key" text NOT NULL DEFAULT '',
	"file_name" text NOT NULL DEFAULT '',
	"file_type" text NOT NULL DEFAULT '',
	"file_size" bigint NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hazardous_event_attachment_hazardous_event_id_hazardous_event_id_fk"
		FOREIGN KEY ("hazardous_event_id")
		REFERENCES "public"."hazardous_event"("id")
		ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "hazardous_event_attachment_event_idx"
	ON "hazardous_event_attachment" ("hazardous_event_id");

-- 6) Migrate old JSON attachments into normalized rows.
INSERT INTO "hazardous_event_attachment" (
	"id",
	"hazardous_event_id",
	"title",
	"file_key",
	"file_name",
	"file_type",
	"file_size"
)
SELECT
	gen_random_uuid(),
	he."id",
	COALESCE(elem ->> 'title', ''),
	COALESCE(elem #>> '{file,name}', elem ->> 'url', ''),
	COALESCE(elem #>> '{file,name}', elem ->> 'url', ''),
	COALESCE(elem #>> '{file,type}', ''),
	COALESCE(NULLIF(elem #>> '{file,size}', ''), '0')::bigint
FROM "hazardous_event" he
CROSS JOIN LATERAL jsonb_array_elements(
	CASE
		WHEN he."attachments" IS NULL THEN '[]'::jsonb
		WHEN jsonb_typeof(he."attachments") = 'array' THEN he."attachments"
		ELSE '[]'::jsonb
	END
) AS elem;

ALTER TABLE "hazardous_event"
	DROP COLUMN IF EXISTS "attachments";

-- 7) Drop legacy event relationship tables.
DROP TABLE IF EXISTS "event_relationship";
DROP TABLE IF EXISTS "event";