import { inArray, or } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { eventRelationshipTable } from "~/drizzle/schema";

type InsertEventRelationship = typeof eventRelationshipTable.$inferInsert;

export const EventRelationshipRepository = {
	getByEventIds: (eventIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(eventRelationshipTable)
			.where(
				or(
					inArray(eventRelationshipTable.parentId, eventIds),
					inArray(eventRelationshipTable.childId, eventIds),
				),
			);
	},

	createMany: (data: InsertEventRelationship[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(eventRelationshipTable)
			.values(data)
			.returning()
			.execute();
	},
};