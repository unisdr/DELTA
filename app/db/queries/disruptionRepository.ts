import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { disruptionTable, InsertDisruption } from "~/drizzle/schema";

export const DisruptionRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(disruptionTable).where(eq(disruptionTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(disruptionTable)
			.where(eq(disruptionTable.recordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(disruptionTable)
			.where(inArray(disruptionTable.recordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(disruptionTable)
			.where(inArray(disruptionTable.recordId, recordIds));
	},
	createMany: (data: InsertDisruption[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(disruptionTable)
			.values(data)
			.returning()
			.execute();
	},
};
