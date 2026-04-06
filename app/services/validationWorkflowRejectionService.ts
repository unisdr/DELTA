import { entityValidationRejectionInsert } from "~/backend.server/models/entity_validation_rejection";
import { approvalStatusIds } from "~/frontend/approval";

import {
	entityValidationAssignmentDeleteByEntityId,
	entityType,
} from "~/backend.server/models/entity_validation_assignment";

interface SaveValidationWorkflowRejectionCommentsParams {
	approvalStatus: approvalStatusIds;
	recordId: string;
	recordType: entityType;
	rejectedByUserId?: string;
	rejectionMessage: string;
}

export async function saveValidationWorkflowRejectionCommentService({
	approvalStatus,
	recordId,
	recordType,
	rejectedByUserId,
	rejectionMessage,
}: SaveValidationWorkflowRejectionCommentsParams): Promise<{
	ok: boolean;
	message: string;
}> {
	// Only save rejection comments when status is "needs-revision"
	if (approvalStatus !== "needs-revision") {
		return {
			ok: false,
			message: "Approval status not set to 'needs-revision'",
		};
	}

	// Validate required fields
	if (!rejectedByUserId) {
		return {
			ok: false,
			message: "Rejected by UserId is required",
		};
	}

	if (!rejectionMessage || rejectionMessage.trim() === "") {
		return {
			ok: false,
			message: "Rejection comments are required",
		};
	}

	try {
		// Insert rejection record to the database
		await entityValidationRejectionInsert({
			entityId: recordId,
			entityType: recordType,
			rejectedByUserId: rejectedByUserId,
			rejectionMessage: rejectionMessage,
		});

		// Delete validation assignment workflow for this record
		await entityValidationAssignmentDeleteByEntityId(recordId, recordType);

		return {
			ok: true,
			message: "Successfully saved",
		};
	} catch (error) {
		console.error("Failed to save rejection comments:", error);
		throw error;
	}
}
