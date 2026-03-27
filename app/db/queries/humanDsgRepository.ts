import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { humanDsgTable, InsertHumanDsg } from "~/drizzle/schema/humanDsgTable";

export const HumanDsgRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(humanDsgTable).where(eq(humanDsgTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanDsgTable)
			.where(eq(humanDsgTable.recordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(humanDsgTable)
			.where(inArray(humanDsgTable.recordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanDsgTable)
			.where(inArray(humanDsgTable.recordId, recordIds));
	},
	createMany: (data: InsertHumanDsg[], tx?: Tx) => {
		return (tx ?? dr).insert(humanDsgTable).values(data).returning().execute();
	},
};
