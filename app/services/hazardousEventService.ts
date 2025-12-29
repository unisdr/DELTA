import { BackendContext } from "~/backend.server/context";
import { hazardousEventById, hazardousEventUpdateApprovalStatus } from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";

export async function updateHazardousEventStatus(ctx: BackendContext, {
  id,
  approvalStatus,
  countryAccountsId,
}: {
  id: string;
  approvalStatus: approvalStatusIds;
  countryAccountsId: string;
}) {
  const record = await hazardousEventById(ctx, id);
  if (!record) {
    return { ok: false, message: "Record not found." };
  }

  // Authorization: user can update
  if (record.countryAccountsId !== countryAccountsId) {
    return { ok: false, message: "You are not allowed to update this record." };
  }

  await hazardousEventUpdateApprovalStatus(id, approvalStatus);
  return { ok: true, message: "Successfully updated." };
}
