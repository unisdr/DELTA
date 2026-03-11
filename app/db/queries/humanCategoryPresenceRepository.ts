import { eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { humanCategoryPresenceTable } from "~/drizzle/schema";

export const HumanCategoryPresenceRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanCategoryPresenceTable)
			.where(eq(humanCategoryPresenceTable.id, id));
	},

	deleteByRecordId: (recordId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanCategoryPresenceTable)
			.where(eq(humanCategoryPresenceTable.recordId, recordId));
	},
	getByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(humanCategoryPresenceTable)
			.where(inArray(humanCategoryPresenceTable.recordId, recordIds));
	},
	deleteByRecordIds: (recordIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanCategoryPresenceTable)
			.where(inArray(humanCategoryPresenceTable.recordId, recordIds));
	},
};
