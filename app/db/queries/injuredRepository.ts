import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { injuredTable } from "~/drizzle/schema";

export const InjuredRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(injuredTable).where(eq(injuredTable.id, id));
	},

	deleteByDsgId: (dsgId: string, tx?: Tx) => {
		return (tx ?? dr).delete(injuredTable).where(eq(injuredTable.dsgId, dsgId));
	},
	deleteByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(injuredTable)
			.where(inArray(injuredTable.dsgId, dsgIds));
	},
};
