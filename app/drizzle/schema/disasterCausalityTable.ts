import { relations, sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";

export const disasterCausalityTable = pgTable("disaster_causality", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	causeDisasterId: uuid("cause_disaster_id").references(
		() => disasterEventTable.id,
		{ onDelete: "set null" },
	),
	effectDisasterId: uuid("effect_disaster_id").references(
		() => disasterEventTable.id,
		{ onDelete: "set null" },
	),
});

export type SelectDisasterCausality =
	typeof disasterCausalityTable.$inferSelect;
export type InsertDisasterCausality =
	typeof disasterCausalityTable.$inferInsert;

export const disasterCausalityRel = relations(
	disasterCausalityTable,
	({ one }) => ({
		causeDisaster: one(disasterEventTable, {
			fields: [disasterCausalityTable.causeDisasterId],
			references: [disasterEventTable.id],
			relationName: "causedDisasters",
		}),
		effectDisaster: one(disasterEventTable, {
			fields: [disasterCausalityTable.effectDisasterId],
			references: [disasterEventTable.id],
			relationName: "causedByDisasters",
		}),
	}),
);
