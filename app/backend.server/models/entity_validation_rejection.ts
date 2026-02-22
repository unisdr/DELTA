import { dr } from "~/db.server";
import {
	entityValidationRejectionTable,
	InsertEntityValidationRejection,
} from "~/drizzle/schema/entityValidationRejectionTable";

export async function entityValidationRejectionInsert(
	props: InsertEntityValidationRejection,
): Promise<void> {
	await dr.insert(entityValidationRejectionTable).values({
		entityId: props.entityId,
		entityType: props.entityType,
		rejectedByUserId: props.rejectedByUserId,
		rejectionMessage: props.rejectionMessage,
	});
}
