import { dr } from '~/db.server';
import {
    entityValidationAssignmentTable,
    InsertEntityValidationAssignment,
} from '~/drizzle/schema';

import { CreateResult, DeleteResult } from '~/backend.server/handlers/form/form';
import { Errors, hasErrors } from '~/frontend/form';

import { isValidUUID } from '~/utils/id';
import { eq, and } from 'drizzle-orm';

export type entityType = 'hazardous_event' | 'disaster_event' | 'disaster_record';

// Remove id and assigned_at from fields
export interface EntityValidationAssignmentFields
    extends Omit<InsertEntityValidationAssignment, 'id' | 'assigned_at'> {}

export const fieldsDefCommon = [
    { key: 'entityId', label: 'Entity ID', type: 'text', required: true },
    { key: 'entityType', label: 'Entity Type', type: 'text', required: true },
    { key: 'assignedToUserId', label: 'Assigned To User ID', type: 'text', required: true },
    { key: 'assignedByUserId', label: 'Assigned By User ID', type: 'text', required: true },
] as const;

export function validate(
    dataArray: EntityValidationAssignmentFields[],
): Errors<EntityValidationAssignmentFields> {
    let errors: Errors<EntityValidationAssignmentFields> = {};
    errors.fields = {};

    for (let row of dataArray) {
        if (!row.entityId) {
            errors.fields.entityId = ['Entity ID is required'];
        } else if (!isValidUUID(row.entityId)) {
            errors.fields.entityId = ['Invalid Entity ID'];
        }
        if (!row.entityType) {
            errors.fields.entityType = ['Entity Type is required'];
        }
        if (!row.assignedToUserId) {
            errors.fields.assignedToUserId = ['Assigned To User ID is required'];
        } else if (!isValidUUID(row.assignedToUserId)) {
            errors.fields.assignedToUserId = ['Invalid Assigned To User ID'];
        }
        if (!row.assignedByUserId) {
            errors.fields.assignedByUserId = ['Assigned By User ID is required'];
        } else if (!isValidUUID(row.assignedByUserId)) {
            errors.fields.assignedByUserId = ['Invalid Assigned By User ID'];
        }
    }

    return errors;
}

export async function entityValidationAssignmentCreate(
    dataArray: EntityValidationAssignmentFields[],
    //countryAccountsId: string
): Promise<CreateResult<EntityValidationAssignmentFields>> {
    let errors = validate(dataArray);
    if (hasErrors(errors)) {
        return { ok: false, errors };
    }

    const res = await dr.insert(entityValidationAssignmentTable).values(dataArray).returning();

    return { ok: true, id: res };
}

export async function entityValidationAssignmentDeleteByEntityId(
    idStr: string,
    entityType: entityType,
): Promise<DeleteResult> {
    await dr
        .delete(entityValidationAssignmentTable)
        .where(
            and(
                eq(entityValidationAssignmentTable.entityId, idStr),
                eq(entityValidationAssignmentTable.entityType, entityType),
            ),
        )
        .execute();

    return { ok: true };
}

// export async function entityValidationAssignmentDeleteByIdAndCountryAccounts(
// 	id: string,
// 	countryAccountsId: string
// ): Promise<DeleteResult> {
// 	await dr.transaction(async (tx) => {
// 		const existingRecord = tx
// 			.select({})
// 			.from(entityValidationAssignment)
// 			.where(
// 				and(
// 					eq(entityValidationAssignment.id, id),
// 					// eq(entityValidationAssignment.countryAccountsId, countryAccountsId)
// 				)
// 			);
// 		if (!existingRecord) {
// 			throw new Error(`Record with ID ${id} not found`);
// 		}
// 		await tx.delete(entityValidationAssignment).where(eq(entityValidationAssignment.id, id));
// 	});
// 	return { ok: true };
// }
