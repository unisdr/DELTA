import { BackendContext } from "../context";
import { Tx } from "~/db.server";
import { hazardousEventTable, disasterEventTable, disasterRecordsTable } from "~/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { 
  entityValidationAssignmentCreate, 
  entityValidationAssignmentDeleteByEntityId,
  EntityValidationAssignmentFields 
} from "../models/entity_validation_assignment";
import { emailAssignedValidators } from "./emailValidationWorkflowService";
import { getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";

export type ApprovalAction = 'submit-validation' | 'submit-draft' | 'submit-validate' | 'submit-publish';
export type EntityType = 'hazardous_event' | 'disaster_event' | 'disaster_record';

export interface ApprovalWorkflowOptions {
    entityId: string;
    entityType: EntityType;
    action: ApprovalAction;
    validatorUserIds?: string[];
    submittedByUserId: string;
    currentStatus: string;
    eventFields?: any;
}

/**
 * Main entry point for handling approval workflow actions.
 * Routes to appropriate handler based on the action type.
 */
export async function handleApprovalWorkflowService(
    ctx: BackendContext,
    tx: Tx,
    id: string,
    entityType: EntityType,
    formData: any
): Promise<void> {

    const entityId = id;
    const userId = formData.updatedByUserId;
    const countryAccountsId = formData.countryAccountsId;
    const table = getTableForEntityType(entityType);
    const [oldRecord] = await tx
        .select()
        .from(table)
        .where(
            and(
                eq(table.id, entityId),
                eq(table.countryAccountsId, countryAccountsId)    
            )
        );
    const currentRecordStatus = oldRecord.approvalStatus;
    
    const userCountryAccounts = await getUserCountryAccountsByUserIdAndCountryAccountsId(userId, countryAccountsId, tx);
    if (!userCountryAccounts) {
        throw new Error('User does not have access to the specified country account');
    }

    console.log("userCountryAccounts", userCountryAccounts.user_country_accounts.role);

    if ("tempAction" in formData && formData.tempAction && formData.updatedByUserId) {
        const action = formData.tempAction as ApprovalAction;
        const submittedByUserId = formData.updatedByUserId as string;
        const validatorUserIds = "tempValidatorUserIds" in formData && formData.tempValidatorUserIds
            ? parseValidatorIds(formData.tempValidatorUserIds as string)
            : undefined;

        const shouldProcess = 
            (action === 'submit-validation' && validatorUserIds?.length && 
                (currentRecordStatus === 'draft' || currentRecordStatus === 'needs-revision')) ||
            (action === 'submit-draft') ||
            (action === 'submit-validate' && 
                (currentRecordStatus === 'draft' || currentRecordStatus === 'needs-revision')) ||
            (action === 'submit-publish' && userCountryAccounts.user_country_accounts.role === 'admin' &&
                (currentRecordStatus === 'draft' || currentRecordStatus === 'needs-revision'));

        if (shouldProcess) {
            switch (action) {
                case 'submit-validation':
                    if (!validatorUserIds || validatorUserIds.length === 0) {
                      throw new Error('Validator user IDs are required for submit-validation action');
                    }
                    await handleSubmitForValidation(ctx, tx, entityId, entityType, validatorUserIds, submittedByUserId, formData);
                    break;

                case 'submit-draft':
                    await handleSubmitAsDraft(tx, entityId, entityType);
                    break;

                case 'submit-validate':
                    await handleSubmitAsValidated(ctx, tx, entityId, entityType, submittedByUserId);
                    break;

                case 'submit-publish':
                    await handleSubmitAsPublished(ctx, tx, entityId, entityType, submittedByUserId);
                    break;

                default:
                    throw new Error(`Unknown approval action: ${action}`);
            }
        }
    }


}


/**
 * Handles the "submit for validation" workflow:
 * 1. Creates validation assignments for selected validators
 * 2. Updates entity status to 'waiting-for-validation'
 * 3. Sends email notifications to assigned validators
 */
async function handleSubmitForValidation(
    ctx: BackendContext,
    tx: Tx,
    entityId: string,
    entityType: EntityType,
    validatorUserIds: string[],
    submittedByUserId: string,
    eventFields?: any
): Promise<void> {
  // Create validation assignments
  const validationAssignedData: EntityValidationAssignmentFields[] = validatorUserIds.map(uuidValidatorAssignedTo => ({
    entityId,
    entityType,
    assignedToUserId: uuidValidatorAssignedTo,
    assignedByUserId: submittedByUserId,
  }));

  await entityValidationAssignmentCreate(validationAssignedData);

  // Update approval status based on entity type
  const table = getTableForEntityType(entityType);
  await tx
    .update(table)
    .set({
      approvalStatus: 'waiting-for-validation',
      submittedByUserId: submittedByUserId,
      submittedAt: new Date(),
    })
    .where(eq(table.id, entityId));

  // Send notification emails
  if (submittedByUserId) {
    try {
      await emailAssignedValidators(ctx, {
        submittedByUserId,
        validatorUserIds,
        entityId,
        entityType,
        eventFields,
      });
    } catch (error) {
      console.error("Failed to send email to assigned validators:", error);
    }
  }
}

/**
 * Handles the "save as draft" workflow:
 * 1. Resets entity status to 'draft'
 * 2. Clears submission metadata
 * 3. Removes all validation assignments
 */
async function handleSubmitAsDraft(
    tx: Tx,
    entityId: string,
    entityType: EntityType
): Promise<void> {
  const table = getTableForEntityType(entityType);
   
  await tx
    .update(table)
    .set({
      approvalStatus: 'draft',
      submittedByUserId: null,
      submittedAt: null,
      validatedByUserId: null,
      validatedAt: null,
      publishedByUserId: null,
      publishedAt: null,     
    })
    .where(eq(table.id, entityId));

  await entityValidationAssignmentDeleteByEntityId(entityId, entityType);
}

/**
 * Handles the "submit and validate" workflow for admin users.
 * This allows admins to auto-validate without assigning to validators.
 * TODO: Implement auto-validation logic for admin users
 */
async function handleSubmitAsValidated(
    ctx: BackendContext,
    tx: Tx,
    entityId: string,
    entityType: EntityType,
    submittedByUserId: string,
): Promise<void> {
  const table = getTableForEntityType(entityType);

  ctx.url('/'); // do nothing

  // Update the entity to published status
  await tx
    .update(table)
    .set({
      approvalStatus: 'validated',
      validatedByUserId: submittedByUserId,
      validatedAt: new Date(),
    })
    .where(eq(table.id, entityId));

  // Remove any existing validation assignments
  await entityValidationAssignmentDeleteByEntityId(entityId, entityType);
  
}

async function handleSubmitAsPublished(
    ctx: BackendContext,
    tx: Tx,
    entityId: string,
    entityType: EntityType,
    submittedByUserId: string,
): Promise<void> {
  const table = getTableForEntityType(entityType);

  ctx.url('/'); // do nothing

  // Update the entity to published status
  await tx
    .update(table)
    .set({
      approvalStatus: 'published',
      publishedByUserId: submittedByUserId,
      publishedAt: new Date(),
    })
    .where(eq(table.id, entityId));

  // Remove any existing validation assignments
  await entityValidationAssignmentDeleteByEntityId(entityId, entityType);
}

/**
 * Parses comma-separated validator IDs string into array of IDs.
 * Trims whitespace and filters out empty strings.
 */
export function parseValidatorIds(tempValidatorUserIds: string): string[] {
  return tempValidatorUserIds
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

/**
 * Gets the appropriate database table for the entity type.
 */
function getTableForEntityType(entityType: EntityType) {
  switch (entityType) {
    case 'hazardous_event':
      return hazardousEventTable;
    case 'disaster_event':
      return disasterEventTable;
    case 'disaster_record':
      return disasterRecordsTable;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
