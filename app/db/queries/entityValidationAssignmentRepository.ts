import { and, eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { entityValidationAssignmentTable } from "~/drizzle/schema";

export const EntityValidationAssignmentRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(entityValidationAssignmentTable)
			.where(eq(entityValidationAssignmentTable.id, id));
	},

	deleteByEntityIdsAndEntityType: (
		entityId: string[],
		entityType: string,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.delete(entityValidationAssignmentTable)
			.where(
				and(
					inArray(entityValidationAssignmentTable.entityId, entityId),
					eq(entityValidationAssignmentTable.entityType, entityType),
				),
			);
	},
};
