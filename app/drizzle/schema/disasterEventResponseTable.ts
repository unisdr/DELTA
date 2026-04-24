import { relations, sql } from "drizzle-orm";
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";
import { responseTypeTable } from "./responseTypeTable";

export const disasterEventResponseTable = pgTable("disaster_event_response", {
	id: uuid("id")
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	disasterEventId: uuid("disaster_event_id").references(
		() => disasterEventTable.id,
		{ onDelete: "cascade" },
	),
	responseTypeId: uuid("response_type_id").references(
		() => responseTypeTable.id,
		{ onDelete: "set null" },
	),
	responseDate: date("response_date"),
	description: text("description"),
});

export type SelectDisasterEventResponse =
	typeof disasterEventResponseTable.$inferSelect;
export type InsertDisasterEventResponse =
	typeof disasterEventResponseTable.$inferInsert;

export const disasterEventResponseRel = relations(
	disasterEventResponseTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventResponseTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
		responseType: one(responseTypeTable, {
			fields: [disasterEventResponseTable.responseTypeId],
			references: [responseTypeTable.id],
		}),
	}),
);
