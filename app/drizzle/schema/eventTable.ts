import { relations } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { ourRandomUUID, zeroText } from "../../utils/drizzleUtil";
import { disasterEventTable } from "./disasterEventTable";
import { hazardousEventTable } from "./hazardousEventTable";
import { eventRelationshipTable } from "./eventRelationshipTable";

export const eventTable = pgTable("event", {
	id: ourRandomUUID(),
	name: zeroText("name").notNull(),
	description: zeroText("description").notNull(),
});

export type Event = typeof eventTable.$inferSelect;
export type EventInsert = typeof eventTable.$inferInsert;

export const eventRel = relations(eventTable, ({ one, many }) => ({
	// hazard event
	he: one(hazardousEventTable, {
		fields: [eventTable.id],
		references: [hazardousEventTable.id],
	}),
	// disaster event
	de: one(disasterEventTable, {
		fields: [eventTable.id],
		references: [disasterEventTable.id],
	}),
	// parents
	ps: many(eventRelationshipTable, { relationName: "c" }),
	// children
	cs: many(eventRelationshipTable, { relationName: "p" }),
}));
