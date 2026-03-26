import { and, eq, inArray } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import {
	entityValidationRejectionTable,
	InsertEntityValidationRejection,
} from "~/drizzle/schema";

export const EntityValidationRejectionRepository = {
	getByEntityIds: (entityIds: string[], tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(entityValidationRejectionTable)
			.where(inArray(entityValidationRejectionTable.entityId, entityIds));
	},

	createMany: (data: InsertEntityValidationRejection[], tx?: Tx) => {
		return (tx ?? dr).insert(entityValidationRejectionTable).values(data);
	},

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
