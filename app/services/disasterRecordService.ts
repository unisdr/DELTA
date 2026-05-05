import {
	disasterRecordsById,
	disasterRecordsUpdateApprovalStatusOnGoing,
	disasterRecordsUpdateApprovalStatusNeedRevision,
	disasterRecordsUpdateApprovalStatusValidate,
	disasterRecordsUpdateApprovalStatusPublish,
} from "~/backend.server/models/disaster_record";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";
import { entityValidationAssignmentDeleteByEntityId } from "~/backend.server/models/entity_validation_assignment";

export async function updateDisasterRecordStatusService({
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
	const record = await disasterRecordsById(id, countryAccountsId);
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
		await disasterRecordsUpdateApprovalStatusOnGoing(id, approvalStatus);
	} else if (approvalStatus === "needs-revision") {
		await disasterRecordsUpdateApprovalStatusNeedRevision(id);
	} else if (approvalStatus === "validated") {
		await disasterRecordsUpdateApprovalStatusValidate(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "disaster_records");
	} else if (approvalStatus === "published") {
		await disasterRecordsUpdateApprovalStatusPublish(id, userId);
		await entityValidationAssignmentDeleteByEntityId(id, "disaster_records");
	}

	return {
		ok: true,
		message: ctx.t({
			code: "common.successfully_updated",
			msg: "Successfully updated",
		}),
	};
}
