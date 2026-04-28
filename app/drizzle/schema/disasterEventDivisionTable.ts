import { relations, sql } from "drizzle-orm";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { disasterEventTable } from "./disasterEventTable";
import { divisionTable } from "./divisionTable";

export const disasterEventDivisionTable = pgTable(
	"disaster_event_division",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		disasterEventId: uuid("disaster_event_id")
			.notNull()
			.references(() => disasterEventTable.id, { onDelete: "cascade" }),
		divisionId: uuid("division_id")
			.notNull()
			.references(() => divisionTable.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at")
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at")
			.notNull()
			.default(sql`now()`),
	},
	(table) => [
		{
			uniquePairIdx: sql`UNIQUE ("disaster_event_id", "division_id")`,
		},
	],
);

export type SelectDisasterEventDivision =
	typeof disasterEventDivisionTable.$inferSelect;
export type InsertDisasterEventDivision =
	typeof disasterEventDivisionTable.$inferInsert;

export const disasterEventDivisionRel = relations(
	disasterEventDivisionTable,
	({ one }) => ({
		disasterEvent: one(disasterEventTable, {
			fields: [disasterEventDivisionTable.disasterEventId],
			references: [disasterEventTable.id],
		}),
		division: one(divisionTable, {
			fields: [disasterEventDivisionTable.divisionId],
			references: [divisionTable.id],
		}),
	}),
);
