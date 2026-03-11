import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { deathsTable } from "~/drizzle/schema";

export const DeathRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(deathsTable).where(eq(deathsTable.id, id));
	},

	deleteByDsgId: (dsgId: string, tx?: Tx) => {
		return (tx ?? dr).delete(deathsTable).where(eq(deathsTable.dsgId, dsgId));
	},
	deleteByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(deathsTable)
			.where(inArray(deathsTable.dsgId, dsgIds));
	},
};
