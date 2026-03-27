import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { nonecoLossesTable, InsertNonecoLosses } from "~/drizzle/schema";

export const NonEcoLossesRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(nonecoLossesTable)
			.where(eq(nonecoLossesTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(nonecoLossesTable)
			.where(eq(nonecoLossesTable.disasterRecordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(nonecoLossesTable)
			.where(inArray(nonecoLossesTable.disasterRecordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(nonecoLossesTable)
			.where(inArray(nonecoLossesTable.disasterRecordId, recordIds));
	},
	createMany: (data: InsertNonecoLosses[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(nonecoLossesTable)
			.values(data)
			.returning()
			.execute();
	},
};
