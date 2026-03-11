import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { displacedTable } from "~/drizzle/schema";

export const DisplacedRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(displacedTable).where(eq(displacedTable.id, id));
	},

	deleteByDsgId: (dsgId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(displacedTable)
			.where(eq(displacedTable.dsgId, dsgId));
	},
	deleteByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(displacedTable)
			.where(inArray(displacedTable.dsgId, dsgIds));
	},
};
