import { relations, sql } from "drizzle-orm";
import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";
import { disasterEventTable } from "./disasterEventTable";

export const disasterHazardousCausalityTable = pgTable(
	"disaster_hazardous_causality",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		disasterEventId: uuid("disaster_event_id").references(
			() => disasterEventTable.id,
			{ onDelete: "set null" },
		),
		hazardousEventId: uuid("hazardous_event_id").references(
			() => hazardousEventTable.id,
			{ onDelete: "set null" },
		),
		causeType: text("cause_type", {
			enum: ["DE_CAUSE_HE", "HE_CAUSE_DE"],
		}).notNull(),
	},
);

export type SelectDisasterHazardousCausality =
	typeof disasterHazardousCausalityTable.$inferSelect;
export type InsertDisasterHazardousCausality =
	typeof disasterHazardousCausalityTable.$inferInsert;

export const disasterHazardousCausalityRel = relations(
	disasterHazardousCausalityTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterHazardousCausalityTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
		hazardousEvent: one(hazardousEventTable, {
			fields: [disasterHazardousCausalityTable.hazardousEventId],
			references: [hazardousEventTable.id],
		}),
	}),
);
