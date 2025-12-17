import { sendEmail } from "~/util/email";
import { configPublicUrl } from "~/util/config";
import { getHazardById, getClusterById, getTypeById } from "~/backend.server/models/hip";
import { getUserById } from "~/db/queries/user";

interface EmailAssignedValidatorsParams {
  validatorUserIds: string[];
  entityId: string;
  entityType: string;
  eventFields: any;
}

export async function emailAssignedValidators({
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
        const hazard = await getHazardById(eventFields.hipHazardId);
        if (hazard && hazard.length > 0) {
            recordEventName = hazard[0].nameEn;
        }
    }
    if (recordEventName == '' && eventFields.hipClusterId) {
        const cluster = await getClusterById(eventFields.hipClusterId);
        if (cluster && cluster.length > 0) {
            recordEventName = cluster[0].nameEn;
        }
    }
    if (recordEventName == '' && eventFields.hipTypeId) {
        const type = await getTypeById(eventFields.hipTypeId);
        if (type && type.length > 0) {
            recordEventName = type[0].nameEn;
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
  if (eventFields.updatedBy) {
    const submitter = await getUserById(eventFields.updatedBy);
    if (submitter) {
      recordSubmitterName = submitter.firstName;
      if (submitter.lastName) {
        recordSubmitterName += ` ${submitter.lastName}`;
      }
    }
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