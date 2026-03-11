import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { missingTable } from "~/drizzle/schema";

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
};
