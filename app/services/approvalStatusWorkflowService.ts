import { BackendContext } from "~/backend.server/context";
import { approvalStatusIds } from "~/frontend/approval";
import { entityType } from "~/backend.server/models/entity_validation_assignment";
import { saveValidationWorkflowRejectionCommentService } from "~/services/validationWorkflowRejectionService";
import { emailValidationWorkflowStatusChangeNotificationService } from "~/backend.server/services/emailValidationWorkflowService";
import { emailAssigneesNotificationService } from "~/backend.server/services/emailValidationWorkflowService";

/** Parameters forwarded to the record-type-specific status update function. */
interface UpdateStatusParams {
	ctx: BackendContext;
	/** UUID of the record being updated. */
	id: string;
	approvalStatus: approvalStatusIds;
	countryAccountsId: string;
	/** UUID of the user performing the action. */
	userId: string;
}

/** Standard service result indicating success or failure with a human-readable message. */
interface UpdateStatusResult {
	ok: boolean;
	message: string;
}

/** Parameters for {@link processApprovalStatusActionService}. */
interface ProcessApprovalStatusActionParams {
	ctx: BackendContext;
	/** The incoming Remix request — used to verify the record ID appears in the URL. */
	request: Request;
	/** Parsed form data from the submit action. Expected fields: `action`, `id`, `rejection-comments`, `assignedToUserId` (multi-value). */
	formData: FormData;
	countryAccountsId: string;
	/** UUID of the authenticated user performing the action. */
	userId: string;
	/** Entity type of the record being acted on (used for assignment and email notifications). */
	recordType: entityType;
	/** Record-type-specific function that persists the new approval status. */
	updateStatusService: (
		params: UpdateStatusParams,
	) => Promise<UpdateStatusResult>;
}

/**
 * Handles a validation-workflow form action for any record type.
 *
 * Dispatches one of four submit actions to the appropriate status transition:
 * - `submit-validate`  → `validated`
 * - `submit-publish`   → `published`
 * - `submit-reject`    → `needs-revision`  (saves rejection comment)
 * - `submit-return`    → `needs-revision`  (saves rejection comment)
 *
 * After a successful status change the function also:
 * 1. Persists a rejection/return comment when the new status is `needs-revision`.
 * 2. Fires email notifications to relevant workflow participants.
 *
 * @returns `{ ok: true }` on success, `{ ok: false, message }` on validation or
 *   update failure. Email errors are swallowed and only logged to the console.
 */
export async function processApprovalStatusActionService({
	ctx,
	request,
	formData,
	countryAccountsId,
	userId,
	recordType,
	updateStatusService,
}: ProcessApprovalStatusActionParams): Promise<UpdateStatusResult> {
	const rejectionComments = formData.get("rejection-comments");
	const actionType = String(formData.get("action") || "");
	const id = String(formData.get("id") || "");

	if (!id || request.url.indexOf(id) === -1) {
		return {
			ok: false,
			message: ctx.t({
				code: "common.invalid_id_provided",
				msg: "Invalid ID provided.",
			}),
		};
	}

	const actionStatusMap: Record<string, string> = {
		"submit-validate": "validated",
		"submit-publish": "published",
		"submit-reject": "needs-revision",
		"submit-return": "needs-revision",
	};

	const newStatus = actionStatusMap[actionType] as approvalStatusIds;
	if (!newStatus) {
		return {
			ok: false,
			message: ctx.t({
				code: "common.invalid_action_provided",
				msg: "Invalid action provided.",
			}),
		};
	}

	let result = await updateStatusService({
		ctx,
		id,
		approvalStatus: newStatus,
		countryAccountsId,
		userId,
	});

	// submit-return and submit-reject uses the same status ("needs-revision")
	if (
		result.ok &&
		newStatus === "needs-revision"
	) {
		result = await saveValidationWorkflowRejectionCommentService({
			ctx,
			countryAccountsId,
			approvalStatus: newStatus,
			recordId: id,
			recordType,
			rejectedByUserId: userId,
			rejectionMessage: rejectionComments ? String(rejectionComments) : "",
		});
	}

	// For "submit-return" actions, trigger a different email notification or workflow than for regular rejections.
	// This notifies the assignees that the record is being returned to them for revision, rather than rejected by a 
	// validator or publisher.
	if (result.ok && actionType === "submit-return") {
		const assignedToUserIdsArray = String(formData.get("assignedToUserIds") || "")
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);

		// TODO: 
		// 1. Clarify with product owner if current (admin / validator user) will be assigned with submittedByUserId

		// send email notification to assignees about the return action
		try {
			await emailAssigneesNotificationService({
				ctx,
				returnedByUserId: userId,
				assigneesUserIdsArray: assignedToUserIdsArray,
				entityId: id,
				entityType: recordType,
				rejectionMessage: rejectionComments ? String(rejectionComments) : "",
			});
		} catch (err) {
			console.error("Failed to send return email notifications:", err);
		}
	}
	else if (result.ok) {
		// send email notifications about the status change to submitter
		try {
			await emailValidationWorkflowStatusChangeNotificationService({
				ctx,
				countryAccountsId,
				recordId: id,
				recordType,
				newStatus,
				rejectionComments: rejectionComments
					? String(rejectionComments)
					: undefined,
			});
		} catch (err) {
			console.error("Failed to send status change email notifications:", err);
		}
	}

	return result;
}
