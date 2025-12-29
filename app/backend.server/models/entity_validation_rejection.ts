import { dr } from "~/db.server";
import { entityValidationRejection, InsertEntityValidationRejection } from "~/drizzle/schema";

export async function entityValidationRejectionInsert(
	props: InsertEntityValidationRejection
): Promise<void> {
	await dr.insert(entityValidationRejection).values({
		entityId: props.entityId,
		entityType: props.entityType,
		rejectedByUserId: props.rejectedByUserId,
		rejectionMessage: props.rejectionMessage,
	});
}
