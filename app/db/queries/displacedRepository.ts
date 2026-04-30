import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { displacedTable, InsertDisplaced } from "~/drizzle/schema";

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
	getByDsgIds: (dsgIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(displacedTable)
			.where(inArray(displacedTable.dsgId, dsgIds));
	},
	createMany: (data: InsertDisplaced[], tx?: Tx) => {
		return (tx ?? dr).insert(displacedTable).values(data).returning().execute();
	},
};
