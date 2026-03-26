import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { damagesTable, InsertDamages } from "~/drizzle/schema";

export const DamagesRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(damagesTable).where(eq(damagesTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(damagesTable)
			.where(eq(damagesTable.recordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(damagesTable)
			.where(inArray(damagesTable.recordId, recordIds));
	},
	createMany: (data: InsertDamages[], tx?: Tx) => {
		return (tx ?? dr).insert(damagesTable).values(data).returning().execute();
	},
};
