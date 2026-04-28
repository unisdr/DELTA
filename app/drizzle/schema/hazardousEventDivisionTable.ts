import { relations, sql } from "drizzle-orm";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { hazardousEventTable } from "../../modules/hazardous-event/infrastructure/db/schema";
import { divisionTable } from "./divisionTable";

export const hazardousEventDivisionTable = pgTable(
	"hazardous_event_division",
	{
		id: uuid("id")
			.primaryKey()
			.default(sql`gen_random_uuid()`),
		hazardousEventId: uuid("hazardous_event_id")
			.notNull()
			.references(() => hazardousEventTable.id, { onDelete: "cascade" }),
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
	() => [
		{
			uniquePairIdx: sql`UNIQUE ("hazardous_event_id", "division_id")`,
		},
	],
);

export type SelectHazardousEventDivision =
	typeof hazardousEventDivisionTable.$inferSelect;
export type InsertHazardousEventDivision =
	typeof hazardousEventDivisionTable.$inferInsert;

export const hazardousEventDivisionRel = relations(
	hazardousEventDivisionTable,
	({ one }) => ({
		hazardousEvent: one(hazardousEventTable, {
			fields: [hazardousEventDivisionTable.hazardousEventId],
			references: [hazardousEventTable.id],
		}),
		division: one(divisionTable, {
			fields: [hazardousEventDivisionTable.divisionId],
			references: [divisionTable.id],
		}),
	}),
);
