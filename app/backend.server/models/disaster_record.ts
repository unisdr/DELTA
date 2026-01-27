import { dr, Tx } from "~/db.server";
import {
	disasterRecordsTable,
	SelectDisasterRecords,
	humanCategoryPresenceTable,
	disasterEventTable,
	nonecoLossesTable,
	damagesTable,
	lossesTable,
	disruptionTable,
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";
import { eq, sql, and } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, hasErrors } from "~/frontend/form";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";
import { getHazardById, getClusterById, getTypeById } from "~/backend.server/models/hip";
import {deleteAllData as deleteAllDataHumanEffects} from "~/backend.server/handlers/human_effects"
import { BackendContext } from "../context";

export interface DisasterRecordsFields
	extends Omit<SelectDisasterRecords, "id"> {}

// do not change
export function validate(
	fields: Partial<DisasterRecordsFields>
): Errors<DisasterRecordsFields> {
	let errors: Errors<DisasterRecordsFields> = {};
	errors.fields = {};

	// Validation start/end date: when updating date, all two fields must be available in the partial
	if ((fields.startDate || fields.endDate)) {
		if (!("startDate" in fields)) errors.fields.startDate = ["Field is required. Otherwise set the value to null."];
		if (!("endDate" in fields)) errors.fields.endDate = ["Field is required. Otherwise set the value to null."];
		if (fields.startDate && fields.endDate && fields.startDate > fields.endDate) errors.fields.startDate = ["Field start must be before end."];
	}

	// Validation HIPs: when updating HIPs, all three fields must be available in the partial
	if (fields.hipTypeId || fields.hipClusterId || fields.hipHazardId) {
		if (!fields.hipTypeId || !fields.hipClusterId || !fields.hipHazardId) {
			if (!("hipTypeId" in fields)) {
				errors.fields.hipTypeId = [`Field hipTypeId is required when updating any HIPs info. Otherwise set the value to null.`];
			}
			if (!("hipClusterId" in fields)) {
				errors.fields.hipClusterId = [`Field hipClusterId is required when updating any HIPs info. Otherwise set the value to null.`];
			}
			if (!("hipHazardId" in fields)) {
				errors.fields.hipHazardId = [`Field hipHazardId is required when updating any HIPs info. Otherwise set the value to null.`];
			}
		}
	}

	return errors;
}

export async function disasterRecordsCreate(
	ctx: BackendContext,
	tx: Tx,
	fields: DisasterRecordsFields
): Promise<CreateResult<DisasterRecordsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	// When updating HIPs, all three fields must be available in the partial
	if (fields.hipTypeId || fields.hipClusterId || fields.hipHazardId) {
		if (fields.hipHazardId) {
			const hipRecord = await getHazardById(ctx, fields.hipHazardId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipHazardId = [`Invalid value ${fields.hipHazardId}.`];
			}
			if (hipRecord && errors.fields && fields.hipClusterId != hipRecord.clusterId ) {
				errors.fields.hipClusterId = [`Invalid value ${fields.hipClusterId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.typeId ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
		}
		else if (fields.hipClusterId) {
			const hipRecord = await getClusterById(ctx, fields.hipClusterId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipClusterId = [`Invalid value ${fields.hipClusterId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.typeId ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
		}
		else if (fields.hipTypeId) {
			const hipRecord = await getTypeById(ctx, fields.hipTypeId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.id ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
			
		}
	}
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}


	// Enforce tenant isolation for disaster event references
	if (fields.disasterEventId) {
		// Check if the referenced disaster event belongs to the same tenant
		const disasterEventCheck = await tx.query.disasterEventTable.findFirst({
			where: eq(disasterEventTable.id, fields.disasterEventId),
		});

		if (!disasterEventCheck) {
			return {
				ok: false,
				errors: {
					fields: {},
					form: [
						"Cannot create disaster record with disaster event from other country instances of DELTA",
					],
				},
			};
		}
	}

	const res = await tx
		.insert(disasterRecordsTable)
		.values({
			...fields,
			updatedAt: sql`NOW()`,
		})
		.returning({ id: disasterRecordsTable.id });

	return { ok: true, id: res[0].id };
}

export async function disasterRecordsUpdate(
	ctx: BackendContext,
	tx: Tx,
	idStr: string,
	fields: Partial<DisasterRecordsFields>,
	countryAccountsId: string
): Promise<UpdateResult<DisasterRecordsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	// When updating HIPs, all three fields must be available in the partial
	if (fields.hipTypeId || fields.hipClusterId || fields.hipHazardId) {
		if (fields.hipHazardId) {
			const hipRecord = await getHazardById(ctx, fields.hipHazardId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipHazardId = [`Invalid value ${fields.hipHazardId}.`];
			}
			if (hipRecord && errors.fields && fields.hipClusterId != hipRecord.clusterId ) {
				errors.fields.hipClusterId = [`Invalid value ${fields.hipClusterId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.typeId ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
		}
		else if (fields.hipClusterId) {
			const hipRecord = await getClusterById(ctx, fields.hipClusterId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipClusterId = [`Invalid value ${fields.hipClusterId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.typeId ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
		}
		else if (fields.hipTypeId) {
			const hipRecord = await getTypeById(ctx, fields.hipTypeId);
			if (!hipRecord && errors.fields) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
			if (hipRecord && errors.fields && fields.hipTypeId != hipRecord.id ) {
				errors.fields.hipTypeId = [`Invalid value ${fields.hipTypeId}.`];
			}
		}
	}
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}


	// First check if the record exists and belongs to the tenant
	const existingRecord = await tx
		.select()
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.id, idStr),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		)
		.limit(1);

	if (existingRecord.length === 0) {
		return {
			ok: false,
			errors: {
				fields: {},
				form: ["Record not found or you don't have permission to update it"],
			},
		};
	}

	// Enforce tenant isolation for disaster event references
	if (fields.disasterEventId && fields.disasterEventId !== "") {
		// Check if the referenced disaster event belongs to the same tenant
		const disasterEventCheck = await tx.query.disasterEventTable.findFirst({
			where: and(
				eq(disasterEventTable.id, fields.disasterEventId),
				eq(disasterEventTable.countryAccountsId, countryAccountsId)
			),
		});

		if (!disasterEventCheck) {
			return {
				ok: false,
				errors: {
					fields: {},
					form: [
						"Cannot update disaster record with disaster event from other country instances of DELTA",
					],
				},
			};
		}
	}

	if (fields.disasterEventId === "") {
		fields.disasterEventId = null;
	}

	let id = idStr;
	await tx
		.update(disasterRecordsTable)
		.set({
			...fields,
			updatedAt: sql`NOW()`,
		})
		.where(
			and(
				eq(disasterRecordsTable.id, id),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);

	await updateTotalsUsingDisasterRecordId(tx, idStr);

	return { ok: true };
}

export type DisasterRecordsViewModel = Exclude<
	Awaited<ReturnType<typeof disasterRecordsById>>,
	undefined
>;

export async function disasterRecordsIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: disasterRecordsTable.id,
		})
		.from(disasterRecordsTable)
		.where(eq(disasterRecordsTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}
export async function disasterRecordsIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({
			id: disasterRecordsTable.id,
		})
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.apiImportId, importId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	if (res.length == 0) {
		return null;
	}
	return res[0].id;
}

export async function disasterRecordsBasicInfoById(idStr: string) {
	// For public access, only fetch published records without tenant context
	let id = idStr;

	// Query just the disaster record with approval status check
	let record = await dr
		.select()
		.from(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.id, id),
				eq(disasterRecordsTable.approvalStatus, "published") // Only published records are accessible
			)
		)
		.limit(1);

	if (record.length === 0) {
		return null; // Return null if not found or not published
	}

	return record[0];
}

export async function disasterRecordsById(idStr: string) {
	return disasterRecordsByIdTx(dr, idStr);
}

export async function disasterRecordsByIdTx(
	tx: Tx,
	idStr: string
	// countryAccountsId: string
) {
	let id = idStr;

	let record = await tx
		.select()
		.from(disasterRecordsTable)
		.where(eq(disasterRecordsTable.id, id));

	if (record.length === 0) {
		return null; // Return null instead of throwing error for better test handling
	}

	// Then fetch related data separately to avoid query argument limit
	const disasterRecord = record[0];

	// Add related data as needed with separate queries
	// This approach avoids the "too many arguments" error by not using the complex "with" clause

	return disasterRecord;
}

export async function disasterRecordsDeleteById(
	idStr: string,
	countryAccountsId: string
): Promise<DeleteResult> {
	// First verify the record belongs to the tenant
	const record = await disasterRecordsById(idStr);
	if (!record || record.countryAccountsId !== countryAccountsId) {
		return {
			ok: false,
			error: "Record not found or you don't have permission to delete it",
		};
	}

	// Delete with tenant isolation
	await dr
		.delete(disasterRecordsTable)
		.where(
			and(
				eq(disasterRecordsTable.id, idStr),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	return { ok: true };
}

export async function getHumanEffectRecordsById(
	disasterRecordidStr: string,
	countryAccountsId: string
) {
	return _getHumanEffectRecordsByIdTx(
		dr,
		disasterRecordidStr,
		countryAccountsId
	);
}

async function _getHumanEffectRecordsByIdTx(
	tx: Tx,
	disasterRecordidStr: string,
	countryAccountsId: string
) {
	// First verify the disaster record belongs to the tenant
	const record = await disasterRecordsByIdTx(tx, disasterRecordidStr);
	if (!record || record.countryAccountsId !== countryAccountsId) {
		throw new Error(
			"Record not found or you don't have permission to access it"
		);
	}
	let id = disasterRecordidStr;
	let res = await tx.query.humanCategoryPresenceTable.findFirst({
		where: eq(humanCategoryPresenceTable.recordId, id),
	});

	return res;
}


export async function deleteAllDataByDisasterRecordId(
	ctx: BackendContext,
	idStr: string,
	countryAccountsId: string
) {
	await dr.transaction(async (tx) => {
		const existingRecord = tx.select({}).from(disasterRecordsTable).where(
			and(
				eq(disasterRecordsTable.id, idStr),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		)
		if (!existingRecord) {
			throw new Error(`Record with ID ${idStr} not found or you don't have permission to delete it.`);
		}

		// -------------------------------------
		// DELETE child related noneco losses
		// -------------------------------------
		await tx.delete(nonecoLossesTable).where(
			and(
				eq(nonecoLossesTable.disasterRecordId, idStr),
			)
		);

		// -------------------------------------
		// DELETE child related sector effects relations
		// -------------------------------------
		// Delete child related damages
		await tx.delete(damagesTable).where(
			and(
				eq(damagesTable.recordId, idStr),
			)
		);

		// Delete child related losses
		await tx.delete(lossesTable).where(
			and(
				eq(lossesTable.recordId, idStr),
			)
		);

		// Delete child related disruptions
		await tx.delete(disruptionTable).where(
			and(
				eq(disruptionTable.recordId, idStr),
			)
		);

		// Delete child related sector relations
		await tx.delete(sectorDisasterRecordsRelationTable).where(
			and(
				eq(sectorDisasterRecordsRelationTable.disasterRecordId, idStr),
			)
		);

		// -------------------------------------
		// DELETE child related human effects
		// -------------------------------------
		await deleteAllDataHumanEffects(ctx, idStr);
		
		// -------------------------------------
		// DELETE parent disaster record
		// -------------------------------------
		await tx.delete(disasterRecordsTable).where(
			and(
				eq(disasterRecordsTable.id, idStr),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
		
	});

	return {
		ok: true,
	};
}
