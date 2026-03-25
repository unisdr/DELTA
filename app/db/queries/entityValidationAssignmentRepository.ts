import { and, eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import {
	entityValidationAssignmentTable,
	InsertEntityValidationAssignment,
} from "~/drizzle/schema";

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
	getByEntityIds: (entityIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(entityValidationAssignmentTable)
			.where(inArray(entityValidationAssignmentTable.entityId, entityIds));
	},
	createMany: (data: InsertEntityValidationAssignment[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(entityValidationAssignmentTable)
			.values(data)
			.returning()
			.execute();
	},
};
