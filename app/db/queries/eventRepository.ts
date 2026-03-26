import { inArray } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { eventTable, EventInsert } from "~/drizzle/schema/eventTable";

export const EventRepository = {
	getByIds: (ids: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(eventTable)
			.where(inArray(eventTable.id, ids));
	},

	createMany: (data: EventInsert[], tx?: Tx) => {
		return (tx ?? dr).insert(eventTable).values(data).returning().execute();
	},
};
