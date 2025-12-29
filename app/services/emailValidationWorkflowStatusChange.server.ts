import { sendEmail } from "~/util/email";
import { configPublicUrl } from "~/util/config";
import { getUserById } from "~/db/queries/user";
// import { emailAssignedValidators } from "~/services/emailValidationWorkflowService.server";
import { hazardousEventById } from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";

interface StatusChangeParams {
  recordId: string;
  recordType: string; // e.g. 'hazardous_event', 'disaster_event', 'disaster_records'
  newStatus: approvalStatusIds;
  rejectionComments?: string | undefined;
}

/**
 * Send notifications when a record changes approval status.
 * - Notifies assigned validators (if any) using existing emailAssignedValidators helper
 * - Sends a published notification to the submitter when status === 'published'
 * - Sends a rejection notification to the submitter when status === 'needs-revision'
 */
export async function emailValidationWorkflowStatusChangeNotifications(
	ctx: BackendContext,
	{
  recordId,
  recordType,
  newStatus,
  rejectionComments,
}: StatusChangeParams): Promise<void> {
  const publicUrl = configPublicUrl();

  

  // Try to load record details for hazardous events (to obtain validator ids and submitter)
  let record: any = null;
  if (recordType === "hazardous_event") {
    try {
      record = await hazardousEventById(ctx, recordId);
    } catch (error) {
      console.error(`Failed to load hazardous event ${recordId}:`, error);
    }
  }

  // // Notify validators if present on the record
  // try {
  //   const validatorUserIds: string[] | undefined = record?.tableValidatorUserIds;
  //   if (validatorUserIds && Array.isArray(validatorUserIds) && validatorUserIds.length > 0) {
  //     // Reuse existing helper to email validators. This will log but won't throw on errors.
  //     await emailAssignedValidators({
  //       submittedByUserId,
  //       validatorUserIds,
  //       entityId: recordId,
  //       entityType: recordType,
  //       eventFields: record || {},
  //     });
  //   }
  // } catch (error) {
  //   console.error(`Failed to notify validators for ${recordType} ${recordId}:`, error);
  // }

  // Notify submitter depending on status
  try {
    const submitterUserId = record?.submittedByUserId;
    if (!submitterUserId) {
      return;
    }

    let submitter: any = null;
    try {
      submitter = await getUserById(submitterUserId);
    } catch (error) {
      console.error(`Failed to load submitter user ${submitterUserId}:`, error);
    }
    if (!submitter || !submitter.email) return;

    const recordUrl = `${publicUrl}/en/${
      recordType === "hazardous_event" ? "hazardous-event" : recordType === "disaster_event" ? "disaster-event" : "disaster-record"
    }/${recordId}`;

    if (newStatus === "published") {
      const subject = `Your record has been published`;
      const html = `
        <p>Dear ${submitter.firstName || "user"},</p>
        <p>Your ${recordType.replace(/_/g, " ")} has been published and is now publicly available.</p>
        <p><a href="${recordUrl}">View record</a></p>
      `.replace(/\t/g, "");
      const text = `Dear ${submitter.firstName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been published and is now publicly available.\n\nView record: ${recordUrl}`;
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send published notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "needs-revision") {
      const subject = `Your record requires changes`;
      const html = `
        <p>Dear ${submitter.firstName || "user"},</p>
        <p>Your ${recordType.replace(/_/g, " ")} has been returned for revision.</p>
        ${rejectionComments ? `<p>Comments: ${rejectionComments}</p>` : ""}
        <p><a href="${recordUrl}">View and edit record</a></p>
      `.replace(/\t/g, "");
      const text = `Dear ${submitter.firstName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been returned for revision.\n\n${rejectionComments ? `Comments: ${rejectionComments}\n\n` : ""}View and edit record: ${recordUrl}`;
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send rejection notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "validated") {
      // Optional: notify submitter their record has been validated
      const subject = `Your record has been validated`;
      const html = `
        <p>Dear ${submitter.firstName || "user"},</p>
        <p>Your ${recordType.replace(/_/g, " ")} has been validated.</p>
        <p><a href="${recordUrl}">View record</a></p>
      `.replace(/\t/g, "");
      const text = `Dear ${submitter.firstName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been validated.\n\nView record: ${recordUrl}`;
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send validated notification to submitter ${submitterUserId}:`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to process submitter notification for ${recordType} ${recordId}:`, error);
  }
}

export default emailValidationWorkflowStatusChangeNotifications;
