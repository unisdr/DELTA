import {
	disasterEventById,
	disasterEventUpdateApprovalStatusOnGoing,
	disasterEventUpdateApprovalStatusNeedRevision,
	disasterEventUpdateApprovalStatusValidate,
	disasterEventUpdateApprovalStatusPublish,
} from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";
import { entityValidationAssignmentDeleteByEntityId } from "~/backend.server/models/entity_validation_assignment";

export async function updateDisasterEventStatusService({
	ctx,
	id,
	approvalStatus,
	countryAccountsId,
	userId,
}: {
	ctx: BackendContext;
	id: string;
	approvalStatus: approvalStatusIds;
	countryAccountsId: string;
	userId: string;
}) {
	const record = await disasterEventById(ctx, id);
	if (!record) {
		return {
			ok: false,
			message: ctx.t({
				code: "common_err_msg.record_not_found",
				msg: "Record not found",
			}),
		};
	}

	// Authorization: user can update
	if (record.countryAccountsId !== countryAccountsId) {
		return {
			ok: false,
			message: ctx.t({
				code: "common_err_msg.not_allowed_to_update_record",
				msg: "You are not allowed to update this record",
			}),
		};
	}

	if (
		approvalStatus !== "validated" &&
		approvalStatus !== "published" &&
		approvalStatus !== "needs-revision"
	) {
		await disasterEventUpdateApprovalStatusOnGoing(id, approvalStatus);
	} else if (approvalStatus === "needs-revision") {
		await disasterEventUpdateApprovalStatusNeedRevision(id);
	} else if (approvalStatus === "validated") {
		await disasterEventUpdateApprovalStatusValidate(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "disaster_event");
	} else if (approvalStatus === "published") {
		await disasterEventUpdateApprovalStatusPublish(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "disaster_event");
	}

	return {
		ok: true,
		message: ctx.t({
			code: "common.successfully_updated",
			msg: "Successfully updated",
		}),
	};
}
