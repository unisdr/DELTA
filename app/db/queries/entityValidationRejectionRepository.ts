import { and, eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { entityValidationRejectionTable } from "~/drizzle/schema";

export const EntityValidationRejectionRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(entityValidationRejectionTable)
			.where(eq(entityValidationRejectionTable.id, id));
	},

	deleteByEntityIdsAndEntityType: (
		entityId: string[],
		entityType: string,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.delete(entityValidationRejectionTable)
			.where(
				and(
					inArray(entityValidationRejectionTable.entityId, entityId),
					eq(entityValidationRejectionTable.entityType, entityType),
				),
			);
	},
};
