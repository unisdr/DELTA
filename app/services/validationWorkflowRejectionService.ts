import { entityValidationRejectionInsert } from "~/backend.server/models/entity_validation_rejection";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";

interface SaveValidationWorkflowRejectionCommentsParams {
  ctx: BackendContext;
  approvalStatus: approvalStatusIds;
  recordId: string;
  recordType: string;
  rejectedByUserId?: string;
  rejectionMessage: string;

}

export async function saveValidationWorkflowRejectionComments({
  ctx,
  approvalStatus,
  recordId,
  recordType,
  rejectedByUserId,
  rejectionMessage,
}: SaveValidationWorkflowRejectionCommentsParams): Promise<{ ok: boolean; message: string }> {
  // Only save rejection comments when status is "needs-revision"
  if (approvalStatus !== "needs-revision") {
    return { ok: false, message: 
      ctx.t({
        "code": "common_err_msg.approval_status_not_set_to_needs_revision",
        "msg": "Approval status not set to 'needs-revision'"
      })
    };
  }

  // Validate required fields
  if (!rejectedByUserId) {
    return { ok: false, message: 
      ctx.t({
        "code": "common_err_msg.rejected_by_userid_required",
        "msg": "Rejected by UserId is required"
      })
    };
  }

  if (!rejectionMessage || rejectionMessage.trim() === "") {
    return { ok: false, message: 
      ctx.t({
        "code": "common_err_msg.rejection_comments_required",
        "msg": "Rejection comments are required"
      })
    };
  }

  try {
    await entityValidationRejectionInsert({
      entityId: recordId,
      entityType: recordType,
      rejectedByUserId: rejectedByUserId,
      rejectionMessage: rejectionMessage,
    });

    return { ok: true, message: 
      ctx.t({
        "code": "common.successfully_saved",
        "msg": "Successfully saved"
      })
    };
  } catch (error) {
    console.error("Failed to save rejection comments:", error);
    throw error;
  }
}
