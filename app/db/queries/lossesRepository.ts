import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { lossesTable, InsertLosses } from "~/drizzle/schema";

export const LossesRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(lossesTable).where(eq(lossesTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(lossesTable)
			.where(eq(lossesTable.recordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(lossesTable)
			.where(inArray(lossesTable.recordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(lossesTable)
			.where(inArray(lossesTable.recordId, recordIds));
	},
	createMany: (data: InsertLosses[], tx?: Tx) => {
		return (tx ?? dr).insert(lossesTable).values(data).returning().execute();
	},
};
