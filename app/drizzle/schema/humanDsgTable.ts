import { pgTable, uuid, AnyPgColumn, text, jsonb } from "drizzle-orm/pg-core";
import { ourRandomUUID } from "../../utils/drizzleUtil";
import { disasterRecordsTable } from "./disasterRecordsTable";

// Common disaggregation data (dsg) for human effects on disaster records

export const humanDsgTable = pgTable("human_dsg", {
	id: ourRandomUUID(),
	recordId: uuid("record_id")
		.references((): AnyPgColumn => disasterRecordsTable.id)
		.notNull(),
	sex: text("sex", {
		enum: ["m", "f", "o"],
	}),
	age: text("age", {
		enum: ["0-14", "15-64", "65+"],
	}),
	disability: text("disability", {
		enum: [
			"none",
			"physical_dwarfism",
			"physical_problems_in_body_functioning",
			"physical_problems_in_body_structures",
			"physical_other_physical_disability",
			"sensorial_visual_impairments_blindness",
			"sensorial_visual_impairments_partial_sight_loss",
			"sensorial_visual_impairments_colour_blindness",
			"sensorial_hearing_impairments_deafness_hard_of_hearing",
			"sensorial_hearing_impairments_deafness_other_hearing_disability",
			"sensorial_other_sensory_impairments",
			"psychosocial",
			"intellectual_cognitive",
			"multiple_deaf_blindness",
			"multiple_other_multiple",
			"others",
		],
	}),
	globalPovertyLine: text("global_poverty_line", { enum: ["below", "above"] }),
	nationalPovertyLine: text("national_poverty_line", {
		enum: ["below", "above"],
	}),
	custom: jsonb("custom").$type<Record<string, any>>(),
});

export type SelectHumanDsg = typeof humanDsgTable.$inferSelect;
export type InsertHumanDsg = typeof humanDsgTable.$inferInsert;
