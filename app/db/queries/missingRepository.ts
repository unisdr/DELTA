import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { missingTable, InsertMissing } from "~/drizzle/schema";

export const MissingRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(missingTable).where(eq(missingTable.id, id));
	},

	deleteByDsgId: (dsgId: string, tx?: Tx) => {
		return (tx ?? dr).delete(missingTable).where(eq(missingTable.dsgId, dsgId));
	},
	deleteByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(missingTable)
			.where(inArray(missingTable.dsgId, dsgIds));
	},
	getByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(missingTable)
			.where(inArray(missingTable.dsgId, dsgIds));
	},
	createMany: (data: InsertMissing[], tx?: Tx) => {
		return (tx ?? dr).insert(missingTable).values(data).returning().execute();
	},
};
