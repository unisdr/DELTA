
import { hazardousEventTable } from "~/drizzle/schema/hazardousEventTable";
import { eq } from "drizzle-orm";
import type { Tx } from "~/db.server";
import type { BackendContext } from "../../context";
import {
	EntityValidationAssignmentFields,
	entityValidationAssignmentCreate,
} from "../entity_validation_assignment";
import { emailAssignedValidators } from "~/backend.server/services/emailValidationWorkflowService";
import type { HazardousEventFields } from "./hazardous_event_create_update";

/**
 * Processes the validation assignment workflow for hazardous events.
 * Assigns validators, updates approval status, and sends notification emails.
 */
export async function processValidationAssignmentWorkflow(
	ctx: BackendContext,
	tx: Tx,
	entityId: string,
	validatorUserIds: string[],
	submittedByUserId: string,
	eventFields: Partial<HazardousEventFields>,
) {
	const validationAssignedData: EntityValidationAssignmentFields[] = [];

	for (let uuidValidatorAssignedTo of validatorUserIds) {
		validationAssignedData.push({
			entityId: entityId,
			entityType: "hazardous_event",
			assignedToUserId: uuidValidatorAssignedTo,
			assignedByUserId: submittedByUserId,
		});
	}

	// STEP 1: save validator ids to database
	await entityValidationAssignmentCreate(validationAssignedData);

	// STEP 2: change the record status to waiting-for-validation
	await tx
		.update(hazardousEventTable)
		.set({
			approvalStatus: "waiting-for-validation",
			submittedByUserId: submittedByUserId,
			submittedAt: new Date(),
		})
		.where(eq(hazardousEventTable.id, entityId));

	// STEP 3: send an email to the assigned validators using the service function
	if (submittedByUserId) {
		try {
			await emailAssignedValidators(ctx, {
				submittedByUserId: submittedByUserId,
				validatorUserIds: validatorUserIds,
				entityId: entityId,
				entityType: "hazardous_event",
				eventFields: eventFields,
			});
		} catch (error) {
			// Log and continue, don't throw
			console.error("Failed to send email to assigned validators:", error);
		}
	}
}

