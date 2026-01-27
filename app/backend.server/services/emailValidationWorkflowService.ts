import { sendEmail } from "~/util/email";
import { configPublicUrl } from "~/util/config";
import { getHazardById, getClusterById, getTypeById } from "~/backend.server/models/hip";
import { getUserById } from "~/db/queries/user";
import { BackendContext } from "~/backend.server/context";
import { hazardousEventById } from "~/backend.server/models/event";
import { approvalStatusIds } from "~/frontend/approval";


interface EmailAssignedValidatorsParams {
  submittedByUserId: string;
  validatorUserIds: string[];
  entityId: string;
  entityType: string;
  eventFields: any;
}

export async function emailAssignedValidators(ctx: BackendContext, {
  submittedByUserId,
  validatorUserIds,
  entityId,
  entityType,
  eventFields,
}: EmailAssignedValidatorsParams) {
  const subject:string = `Event validation`;
  let recordUrl:string = configPublicUrl();
  let recordType:string = '';
  let recordStartDate:string = '';
  let recordEndDate:string = '';
  let recordDate:string = '';
  let recordEventName:string = '';
  let recordValidatorName:string = '';
  let recordSubmitterName:string = '';

  if (entityType === 'hazardous_event') {
    recordUrl += `/en/hazardous-event/${entityId}`;
    recordType = 'hazardous event';
    // Get event name from HIPs associated with the hazardous event
    if (eventFields.hipHazardId) {
        const hazard = await getHazardById(ctx, eventFields.hipHazardId);
        if (hazard) {
            recordEventName = hazard.name;
        }
    }
    if (recordEventName == '' && eventFields.hipClusterId) {
        const cluster = await getClusterById(ctx, eventFields.hipClusterId);
        if (cluster) {
            recordEventName = cluster.name;
        }
    }
    if (recordEventName == '' && eventFields.hipTypeId) {
        const type = await getTypeById(ctx, eventFields.hipTypeId);
        if (type) {
            recordEventName = type.name;
        }
    }
  }
  else if (entityType === 'disaster_event') {
    recordUrl += `/en/disaster-event/${entityId}`;
    recordType = 'disaster event';
  }
  else if (entityType === 'disaster_records') {
    recordUrl += `/en/disaster-record/${entityId}`;
    recordType = 'disaster record';
  }
  recordStartDate = eventFields.startDate || '';
  recordEndDate = eventFields.endDate || '';
  if (recordStartDate || recordEndDate) {
    recordDate = recordStartDate;
    if (recordEndDate && recordEndDate !== recordStartDate) {
      recordDate += ` to ${recordEndDate}`;
    }
  }
  try {
    const submitter = await getUserById(submittedByUserId);
    if (submitter) {
      recordSubmitterName = submitter.firstName;
      if (submitter.lastName) {
        recordSubmitterName += ` ${submitter.lastName}`;
      }
    }
  } catch (error) {
    console.error(`Failed to get submitter user ${submittedByUserId}:`, error);
  }


  let html = `
    <p>
    Dear [validator.name],
    </p>
    <p>
      A new ${recordType} is waiting for your action. Click the link below to view the event.
    </p>
    <p>
      Event name: ${recordEventName} <br />
      Event date: ${recordDate} <br />
      Submitted by: ${recordSubmitterName}
    </p>
    <p>
      <a href="${recordUrl}">View event</a>
    </p>
  `.replace(/\t/g, "");

  let text = `
    Dear [validator.name],
    A new ${recordType} is waiting for your action. Click the link below to view the event.
    Event name: ${recordEventName}
    Event date: ${recordDate}
    Submitted by: ${recordSubmitterName}

    View event: ${recordUrl}
  `.replace(/\t/g, "");

  // Replace this with actual lookup of validator emails
  for (const userId of validatorUserIds) {
    try {
        recordValidatorName = '';
        const validatorUser = await getUserById(userId);
        if (validatorUser) {
            recordValidatorName = validatorUser.firstName;
            if (validatorUser.lastName) {
                recordValidatorName += ` ${validatorUser.lastName}`;
            }

            const emailText = text.replace('[validator.name]', recordValidatorName);
            const emailHtml = html.replace('[validator.name]', recordValidatorName);

            if (validatorUser.email) {
                await sendEmail(validatorUser.email, subject, emailText, emailHtml);
            }
        }
    } catch (error) {
      // Log and continue, don't throw
      console.error(`Failed to send email to validator ${userId}:`, error);
    }
  }
}



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

  // Try to load record details for hazardous events (to obtain submitter info)
  let record: any = null;
  if (recordType === "hazardous_event") {
    try {
      record = await hazardousEventById(ctx, recordId);
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
        "code": "hazardous_event",
        "msg": "Hazardous event"
      }).toLowerCase();
    }
    else if (recordType === "disaster_event") {
      recordTypeData = ctx.t({
        "code": "disaster_event",
        "msg": "Disaster event"
      }).toLowerCase();
    }
    else if (recordType === "disaster_records") {
      recordTypeData = ctx.t({
        "code": "disaster_event.disaster_record",
        "msg": "Disaster record"
      }).toLowerCase();
    }
    recordTypeData = recordTypeData.toLowerCase();

    if (newStatus === "published") {
      const subject = ctx.t({
        "code": "email.validation_workflow.subject_published",
        "msg": "Your record has been published"
      });
      const html = ctx.t({
        "code": "email.validation_workflow.body_published_html",
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
      const text = ctx.t({
        "code": "email.validation_workflow.body_published_text",
        "msg": [
          "Dear {submitterName},",
          "",
          "Your {recordTypeData} has been published and is now publicly available.",
          "",
          "View record: {recordUrl}"  
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "recordUrl": recordUrl
      });     

      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send published notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "needs-revision") {
      const subject = ctx.t({
        "code": "email.validation_workflow.subject_needs_revision",
        "msg": "Your record requires changes"
      });
      const html = ctx.t({
        "code": "email.validation_workflow.body_needs_revision_html",
        "msg": [
          "<p>Dear {submitterName},</p>",
          "<p>Your {recordTypeData} has been returned for revision.</p>",
          "<p>Comments: {rejectionComments}</p>",
          "<p><a href=\"{recordUrl}\">View and edit record</a></p>"
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "rejectionComments": rejectionComments || "",
        "recordUrl": recordUrl
      });

      const text = ctx.t({
        "code": "email.validation_workflow.body_needs_revision_text",
        "msg": [
          "Dear {submitterName},",
          "",
          "Your {recordTypeData} has been returned for revision.",
          "",
          "Comments: {rejectionComments}",
          "",
          "View and edit record: {recordUrl}"
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "rejectionComments": rejectionComments || "",
        "recordUrl": recordUrl
      });
      
      try {
        await sendEmail(submitter.email, subject, text, html);
      } catch (error) {
        console.error(`Failed to send rejection notification to submitter ${submitterUserId}:`, error);
      }
    } else if (newStatus === "validated") {
      // Optional: notify submitter their record has been validated
      const subject = ctx.t({
        "code": "email.validation_workflow.subject_validated",
        "msg": "Your record has been validated"
      });
      
      const html = ctx.t({
        "code": "email.validation_workflow.body_validated_html",
        "msg": [
          "<p>Dear {submitterName},</p>",
          "<p>Your {recordTypeData} has been validated.</p>",
          "<p><a href=\"{recordUrl}\">View record</a></p>"
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "recordUrl": recordUrl
      });
      const text = ctx.t({
        "code": "email.validation_workflow.body_validated_text",
        "msg": [
          "Dear {submitterName},",
          "",
          "Your {recordTypeData} has been validated.",
          "",
          "View record: {recordUrl}"
        ]
      }, {
        "submitterName": submitterName || "user",
        "recordTypeData": recordTypeData,
        "recordUrl": recordUrl
      });

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
