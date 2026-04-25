import { relations, sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";

export const hazardCausalityTable = pgTable("hazard_causality", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	causeHazardousEventId: uuid("cause_hazardous_event_id").references(
		() => hazardousEventTable.id,
		{ onDelete: "set null" },
	),
	effectHazardousEventId: uuid("effect_hazardous_event_id").references(
		() => hazardousEventTable.id,
		{ onDelete: "set null" },
	),
});

export type SelectHazardCausality = typeof hazardCausalityTable.$inferSelect;
export type InsertHazardCausality = typeof hazardCausalityTable.$inferInsert;

export const hazardCausalityRel = relations(
	hazardCausalityTable,
	({ one }) => ({
		causeHazardousEvent: one(hazardousEventTable, {
			fields: [hazardCausalityTable.causeHazardousEventId],
			references: [hazardousEventTable.id],
			relationName: "hazardCausalityCause",
		}),
		effectHazardousEvent: one(hazardousEventTable, {
			fields: [hazardCausalityTable.effectHazardousEventId],
			references: [hazardousEventTable.id],
			relationName: "hazardCausalityEffect",
		}),
	}),
);
