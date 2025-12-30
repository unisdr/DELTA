import { hazardousEventById, hazardousEventUpdateApprovalStatus } from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";

export async function updateHazardousEventStatus({
  ctx,
  id,
  approvalStatus,
  countryAccountsId,
}: {
  ctx: BackendContext;
  id: string;
  approvalStatus: approvalStatusIds;
  countryAccountsId: string;
}) {
  const record = await hazardousEventById(ctx, id);
  if (!record) {
    return { ok: false, message: 
      ctx.t({
        "code": "common_err_msg.record_not_found",
        "msg": "Record not found"
      })
    };
  }

  // Authorization: user can update
  if (record.countryAccountsId !== countryAccountsId) {
    return { ok: false, message: 
      ctx.t({
        "code": "common_err_msg.not_allowed_to_update_record",
        "msg": "You are not allowed to update this record"
      })
    };
  }

  await hazardousEventUpdateApprovalStatus(id, approvalStatus);
  return { ok: true, message: 
    ctx.t({
        "code": "common.successfully_updated",
        "msg": "Successfully updated"
      })
    };
}
