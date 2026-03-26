import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { affectedTable, InsertAffected } from "~/drizzle/schema/affectedTable";

export const AffectedRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(affectedTable).where(eq(affectedTable.id, id));
	},

	deleteByDsgId: (dsgId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(affectedTable)
			.where(eq(affectedTable.dsgId, dsgId));
	},
	deleteByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(affectedTable)
			.where(inArray(affectedTable.dsgId, dsgIds));
	},
	getByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(affectedTable)
			.where(inArray(affectedTable.dsgId, dsgIds));
	},
	createMany: (data: InsertAffected[], tx?: Tx) => {
		return (tx ?? dr).insert(affectedTable).values(data).returning().execute();
	},
};
