import { sendEmail } from "~/util/email";
import { getUserById } from "~/db/queries/user";
// import { emailAssignedValidators } from "~/services/emailValidationWorkflowService.server";
import { hazardousEventById } from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";
import { BackendContext } from "~/backend.server/context";

interface StatusChangeParams {
  ctx: BackendContext;
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
export async function emailValidationWorkflowStatusChangeNotifications({
  ctx,
  recordId,
  recordType,
  newStatus,
  rejectionComments,
}: StatusChangeParams): Promise<void> {
  

  

  // Try to load record details for hazardous events (to obtain validator ids and submitter)
  let record: any = null;
  if (recordType === "hazardous_event") {
    try {
      record = await hazardousEventById(recordId);
    } catch (error) {
      console.error(`Failed to load hazardous event ${recordId}:`, error);
    }
  }

  console.log('record', record);

  // Notify submitter depending on status
  try {
    const submitterUserId = record?.submittedByUserId;
    if (!submitterUserId) {
      return;
    }

    let submitter: any = null;
    let submitterName: string = "";
    try {
      submitter = await getUserById(submitterUserId);
      submitterName = `${submitter.firstName || ""} ${submitter.lastName || ""}`.trim();
    } catch (error) {
      console.error(`Failed to load submitter user ${submitterUserId}:`, error);
    }
    if (!submitter || !submitter.email) return;

    const recordUrl = ctx.url(`/${
      recordType === "hazardous_event" ? "hazardous-event" : recordType === "disaster_event" ? "disaster-event" : "disaster-record"
    }/${recordId}`);
    let recordTypeData = recordType;
    if (recordType === "hazardous_event") {
      recordTypeData = ctx.t({
        code: "hazardous_event",
        msg: "hazardous event"
      });
    }
    else if (recordType === "disaster_event") {
      recordTypeData = ctx.t({
        code: "disaster_event",
        msg: "disaster event"
      });
    }
    else if (recordType === "disaster_records") {
      recordTypeData = ctx.t({
        code: "disaster_event.disaster_record",
        msg: "disaster record"
      });
    }

    if (newStatus === "published") {
      const subject = ctx.t({
        code: "email.validation_workflow.subject_published",
        msg: "Your record has been published"
      });
      const html = ctx.t({
        "code": "email.validation_workflow.body_published",
        "msg": [
          "<p>Dear {submitterName},</p>",
          "<p>Your {recordTypeData} has been published and is now publicly available.</p>",
          "<p><a href=\"{recordUrl}\">View record</a></p>"
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "recordUrl": recordUrl
      });
      const text = `Dear ${submitterName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been published and is now publicly available.\n\nView record: ${recordUrl}`;
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send published notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "needs-revision") {
      const subject = `Your record requires changes`;
      const html = `
        <p>Dear ${submitterName || "user"},</p>
        <p>Your ${recordType.replace(/_/g, " ")} has been returned for revision.</p>
        ${rejectionComments ? `<p>Comments: ${rejectionComments}</p>` : ""}
        <p><a href="${recordUrl}">View and edit record</a></p>
      `.replace(/\t/g, "");
      const text = `Dear ${submitterName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been returned for revision.\n\n${rejectionComments ? `Comments: ${rejectionComments}\n\n` : ""}View and edit record: ${recordUrl}`;
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send rejection notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "validated") {
      // Optional: notify submitter their record has been validated
      const subject = `Your record has been validated`;
      const html = `
        <p>Dear ${submitterName || "user"},</p>
        <p>Your ${recordType.replace(/_/g, " ")} has been validated.</p>
        <p><a href="${recordUrl}">View record</a></p>
      `.replace(/\t/g, "");
      const text = `Dear ${submitterName || "user"},\n\nYour ${recordType.replace(/_/g, " ")} has been validated.\n\nView record: ${recordUrl}`;
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
