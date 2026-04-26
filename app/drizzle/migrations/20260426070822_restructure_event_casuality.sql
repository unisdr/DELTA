DROP TABLE IF EXISTS "public"."disaster_hazardous_causality";
DROP TABLE IF EXISTS "public"."disaster_causality";
DROP TABLE IF EXISTS "public"."hazard_causality";

CREATE TABLE "public"."event_causality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cause_entity_type" char(2) NOT NULL,
	"cause_hazardous_event_id" uuid,
	"cause_disaster_event_id" uuid,
	"effect_entity_type" char(2) NOT NULL,
	"effect_hazardous_event_id" uuid,
	"effect_disaster_event_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_causality_cause_entity_type_chk" CHECK ("cause_entity_type" IN ('HE', 'DE')),
	CONSTRAINT "event_causality_effect_entity_type_chk" CHECK ("effect_entity_type" IN ('HE', 'DE')),
	CONSTRAINT "event_causality_chk_cause_fk" CHECK (
		("cause_entity_type" = 'HE' AND "cause_hazardous_event_id" IS NOT NULL AND "cause_disaster_event_id" IS NULL) OR
		("cause_entity_type" = 'DE' AND "cause_disaster_event_id" IS NOT NULL AND "cause_hazardous_event_id" IS NULL)
	),
	CONSTRAINT "event_causality_chk_effect_fk" CHECK (
		("effect_entity_type" = 'HE' AND "effect_hazardous_event_id" IS NOT NULL AND "effect_disaster_event_id" IS NULL) OR
		("effect_entity_type" = 'DE' AND "effect_disaster_event_id" IS NOT NULL AND "effect_hazardous_event_id" IS NULL)
	),
	CONSTRAINT "event_causality_uq_causality" UNIQUE (
		"cause_entity_type",
		"cause_hazardous_event_id",
		"cause_disaster_event_id",
		"effect_entity_type",
		"effect_hazardous_event_id",
		"effect_disaster_event_id"
	)
);

ALTER TABLE "public"."event_causality"
	ADD CONSTRAINT "event_causality_cause_hazardous_event_id_hazardous_event_id_fk"
	FOREIGN KEY ("cause_hazardous_event_id") REFERENCES "public"."hazardous_event"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "public"."event_causality"
	ADD CONSTRAINT "event_causality_cause_disaster_event_id_disaster_event_id_fk"
	FOREIGN KEY ("cause_disaster_event_id") REFERENCES "public"."disaster_event"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "public"."event_causality"
	ADD CONSTRAINT "event_causality_effect_hazardous_event_id_hazardous_event_id_fk"
	FOREIGN KEY ("effect_hazardous_event_id") REFERENCES "public"."hazardous_event"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "public"."event_causality"
	ADD CONSTRAINT "event_causality_effect_disaster_event_id_disaster_event_id_fk"
	FOREIGN KEY ("effect_disaster_event_id") REFERENCES "public"."disaster_event"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX "event_causality_cause_hazardous_idx" ON "public"."event_causality" ("cause_hazardous_event_id");
CREATE INDEX "event_causality_cause_disaster_idx" ON "public"."event_causality" ("cause_disaster_event_id");
CREATE INDEX "event_causality_effect_hazardous_idx" ON "public"."event_causality" ("effect_hazardous_event_id");
CREATE INDEX "event_causality_effect_disaster_idx" ON "public"."event_causality" ("effect_disaster_event_id");