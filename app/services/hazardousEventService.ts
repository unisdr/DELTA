import {
	hazardousEventById,
	//hazardousEventUpdateApprovalStatus,
	hazardousEventUpdateApprovalStatusOnGoing,
	hazardousEventUpdateApprovalStatusNeedRevision,
	hazardousEventUpdateApprovalStatusValidate,
	hazardousEventUpdateApprovalStatusPublish,
} from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";

import { entityValidationAssignmentDeleteByEntityId } from "~/backend.server/models/entity_validation_assignment";

export async function updateHazardousEventStatusService({
	id,
	approvalStatus,
	countryAccountsId,
	userId,
}: {
	id: string;
	approvalStatus: approvalStatusIds;
	countryAccountsId: string;
	userId: string;
}) {
	const record = await hazardousEventById(id);
	if (!record) {
		return {
			ok: false,
			message: "Record not found",
		};
	}

	// Authorization: user can update
	if (record.countryAccountsId !== countryAccountsId) {
		return {
			ok: false,
			message: "You are not allowed to update this record",
		};
	}

	if (
		approvalStatus !== "validated" &&
		approvalStatus !== "published" &&
		approvalStatus !== "needs-revision"
	) {
		await hazardousEventUpdateApprovalStatusOnGoing(id, approvalStatus);
	} else if (approvalStatus === "needs-revision") {
		await hazardousEventUpdateApprovalStatusNeedRevision(id);
	} else if (approvalStatus === "validated") {
		await hazardousEventUpdateApprovalStatusValidate(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "hazardous_event");
	} else if (approvalStatus === "published") {
		await hazardousEventUpdateApprovalStatusPublish(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "hazardous_event");
	}

	return {
		ok: true,
		message: "Successfully updated",
	};
}
