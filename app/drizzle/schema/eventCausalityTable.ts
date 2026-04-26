import { relations, sql } from "drizzle-orm";
import { char, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";
import { disasterEventTable } from "./disasterEventTable";

export const eventCausalityTable = pgTable("event_causality", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	causeEntityType: char("cause_entity_type", {
		length: 2,
		enum: ["HE", "DE"],
	}).notNull(),
	causeHazardousEventId: uuid("cause_hazardous_event_id").references(
		() => hazardousEventTable.id,
		{ onDelete: "set null" },
	),
	causeDisasterEventId: uuid("cause_disaster_event_id").references(
		() => disasterEventTable.id,
		{ onDelete: "set null" },
	),
	effectEntityType: char("effect_entity_type", {
		length: 2,
		enum: ["HE", "DE"],
	}).notNull(),
	effectHazardousEventId: uuid("effect_hazardous_event_id").references(
		() => hazardousEventTable.id,
		{ onDelete: "set null" },
	),
	effectDisasterEventId: uuid("effect_disaster_event_id").references(
		() => disasterEventTable.id,
		{ onDelete: "set null" },
	),
	createdAt: timestamp("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export type SelectEventCausality = typeof eventCausalityTable.$inferSelect;
export type InsertEventCausality = typeof eventCausalityTable.$inferInsert;

export const eventCausalityRel = relations(eventCausalityTable, ({ one }) => ({
	causeHazardousEvent: one(hazardousEventTable, {
		fields: [eventCausalityTable.causeHazardousEventId],
		references: [hazardousEventTable.id],
		relationName: "eventCausalityCauseHazardous",
	}),
	effectHazardousEvent: one(hazardousEventTable, {
		fields: [eventCausalityTable.effectHazardousEventId],
		references: [hazardousEventTable.id],
		relationName: "eventCausalityEffectHazardous",
	}),
	causeDisasterEvent: one(disasterEventTable, {
		fields: [eventCausalityTable.causeDisasterEventId],
		references: [disasterEventTable.id],
		relationName: "eventCausalityCauseDisaster",
	}),
	effectDisasterEvent: one(disasterEventTable, {
		fields: [eventCausalityTable.effectDisasterEventId],
		references: [disasterEventTable.id],
		relationName: "eventCausalityEffectDisaster",
	}),
}));
