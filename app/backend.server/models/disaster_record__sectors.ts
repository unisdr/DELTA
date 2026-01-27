import { dr, Tx } from "~/db.server";
import {
	sectorDisasterRecordsRelationTable,
	SelectSectorDisasterRecordsRelation as disRecSectorsType,
	sectorTable,
	disasterRecordsTable,
} from "~/drizzle/schema";
import { eq, sql, and, aliasedTable } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";
import { getDisasterRecordsByIdAndCountryAccountsId } from "~/db/queries/disasterRecords";
import { BackendContext } from "../context";

export interface DisRecSectorsFields extends Omit<disRecSectorsType, "id"> {}

export const fieldsDefCommon = [
	{ key: "sectorId", label: "Sector", type: "text", required: true },
	{
		key: "disasterRecordId",
		label: "Disaster Record",
		type: "text",
		required: true,
	},
	{ key: "withDamage", label: "With Damage", type: "bool" },
	{ key: "damageCost", label: "Damage Cost", type: "money" },
	{ key: "damageCostCurrency", label: "Damage Cost Currency", type: "text" },
	{ key: "damageRecoveryCost", label: "Damage Recovery cost", type: "money" },
	{
		key: "damageRecoveryCostCurrency",
		label: "Damage Recovery cost Currency",
		type: "text",
	},
	{ key: "withDisruption", label: "With Disruption", type: "bool" },
	{ key: "withLosses", label: "With Losses", type: "bool" },
	{ key: "lossesCost", label: "Losses Cost", type: "money" },
	{ key: "lossesCostCurrency", label: "Losses Cost Currency", type: "text" },
] as const;

/*
export const fieldsDef: FormInputDef<DisRecSectorsFields>[] = [
	...fieldsDefCommon
];*/

export const fieldsDefApi: FormInputDef<DisRecSectorsFields>[] = [
	...fieldsDefCommon,
	{ key: "apiImportId", label: "", type: "other" },
];

// do not change
export function validate(
	fields: Partial<DisRecSectorsFields>
): Errors<DisRecSectorsFields> {
	let errors: Errors<DisRecSectorsFields> = {};
	errors.fields = {};

	// Validation damage
	if (fields.withDamage || fields.damageCost || fields.damageCostCurrency || fields.damageRecoveryCost || fields.damageRecoveryCostCurrency) {
		if (("withDamage" in fields) && fields.withDamage == false) {
			if (fields.damageCost) errors.fields.damageCost = ["Field value must be set to null."];
			if (fields.damageCostCurrency) errors.fields.damageCostCurrency = ["Field value must be set to null."];
			if (fields.damageRecoveryCost) errors.fields.damageRecoveryCost = ["Field value must be set to null."];
			if (fields.damageRecoveryCostCurrency) errors.fields.damageRecoveryCostCurrency = ["Field value must be set to null."];
		}
		else if (("withDamage" in fields) && fields.withDamage == true) {
			if ((("damageCost" in fields) || ("damageCostCurrency" in fields)) && (!fields.damageCost || !fields.damageCostCurrency)) {
				if (!fields.damageCost) errors.fields.damageCost = ["Field is required."];
				if (!fields.damageCostCurrency) errors.fields.damageCostCurrency = ["Field is required."];
			}
			if ((("damageRecoveryCost" in fields) || ("damageRecoveryCostCurrency" in fields)) && (!fields.damageRecoveryCost || !fields.damageRecoveryCostCurrency)) {
				if (!fields.damageCost) errors.fields.damageCost = ["Field is required."];
				if (!fields.damageRecoveryCost) errors.fields.damageRecoveryCostCurrency = ["Field is required."];
			}
		}
		if (!("withDamage" in fields)) {
			errors.fields.withDamage = ["Field is required and must be value must be set to true."];
		}
	}

	// Validation for losses
	if (fields.withLosses || fields.lossesCost || fields.lossesCostCurrency) {
		if (("withLosses" in fields) && fields.withLosses == false) {
			if (fields.lossesCost) errors.fields.lossesCost = ["Field value must be set to null."];
			if (fields.lossesCostCurrency) errors.fields.lossesCostCurrency = ["Field value must be set to null."];
		}
		else if (("withLosses" in fields) && fields.withLosses == true) {
			if (!fields.lossesCost) errors.fields.lossesCost = ["Field is required."];
			if (!fields.lossesCostCurrency) errors.fields.lossesCostCurrency = ["Field is required."];
		}
	}

	// At least one of damage/disruption/losses must be selected
	if (
		(
			!("withDamage" in fields) && !("withDisruption" in fields) && !("withLosses" in fields)
		)
		||
		(
			("withDamage" in fields) && ("withDisruption" in fields) && ("withLosses" in fields) &&
			fields.withDamage == false && fields.withDisruption == false && fields.withLosses == false
		)
	) {
		errors.fields.withDamage = ["At least one of damage, disruption, or losses must be selected."];
		errors.fields.withDisruption = ["At least one of damage, disruption, or losses must be selected."];
		errors.fields.withLosses = ["At least one of damage, disruption, or losses must be selected."];
	}

	return errors;
}

export async function disRecSectorsCreate(
	_ctx: BackendContext,
	tx: Tx,
	fields: DisRecSectorsFields
): Promise<CreateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	try {
		const res = await tx
			.insert(sectorDisasterRecordsRelationTable)
			.values({
				...fields,
			})
			.returning({ id: sectorDisasterRecordsRelationTable.id });

		await updateTotalsUsingDisasterRecordId(tx, fields.disasterRecordId);

		return { ok: true, id: res[0].id };
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);

		return {
			ok: false,
			errors: {
				general: ["Error during validation: " + errorMessage],
			},
		};
	}

}

export async function disRecSectorsUpdate(
	_ctx: BackendContext,
	tx: Tx,
	idStr: string,
	fields: Partial<DisRecSectorsFields>
): Promise<UpdateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	let id = idStr;
	await tx
		.update(sectorDisasterRecordsRelationTable)
		.set({
			...fields,
		})
		.where(eq(sectorDisasterRecordsRelationTable.id, id));

	let recordId = await getRecordId(tx, idStr);
	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function disRecSectorsUpdateByIdAndCountryAccountsId(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DisRecSectorsFields>
): Promise<UpdateResult<DisRecSectorsFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	let recordId = await getRecordId(tx, id);
	const disasterRecords = getDisasterRecordsByIdAndCountryAccountsId(
		recordId,
		countryAccountsId
	);
	if (!disasterRecords) {
		return {
			ok: false,
			errors: {
				general: ["No matching disaster record found or you don't have access"],
			},
		};
	}

	try {
		await tx
			.update(sectorDisasterRecordsRelationTable)
			.set({
				...fields,
			})
			.where(eq(sectorDisasterRecordsRelationTable.id, id));

		await updateTotalsUsingDisasterRecordId(tx, recordId);
	}
	catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);

		return {
			ok: false,
			errors: {
				general: ["Error during validation: " + errorMessage],
			},
		};
	}

	return { ok: true };
}

export async function getRecordId(tx: Tx, id: string) {
	let rows = await tx
		.select({
			recordId: sectorDisasterRecordsRelationTable.disasterRecordId,
		})
		.from(sectorDisasterRecordsRelationTable)
		.where(eq(sectorDisasterRecordsRelationTable.id, id))
		.execute();
	if (!rows.length) throw new Error("not found by id");
	return rows[0].recordId;
}

export async function filterByDisasterRecordId_SectorId(
	idDisterRecordStr: string,
	idSector: string
) {
	return filterByDisasterRecordId_SectorIdTx(dr, idDisterRecordStr, idSector);
}

export async function filterByDisasterRecordId_SectorIdTx(
	tx: Tx,
	idDisterRecordStr: string,
	idSector: string
) {
	let idDisterRecord = idDisterRecordStr;
	let res = await tx.query.sectorDisasterRecordsRelationTable.findMany({
		where: and(
			eq(sectorDisasterRecordsRelationTable.disasterRecordId, idDisterRecord),
			eq(sectorDisasterRecordsRelationTable.sectorId, idSector)
		),
	});

	return res;
}

export async function deleteRecordsDeleteById(
	idStr: string
): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable);
	return { ok: true };
}

export type DisRecSectorsViewModel = Exclude<
	Awaited<ReturnType<typeof disRecSectorsById>>,
	undefined
>;

export async function disRecSectorsIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: sectorDisasterRecordsRelationTable.id,
		})
		.from(sectorDisasterRecordsRelationTable)
		.where(eq(sectorDisasterRecordsRelationTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}
export async function disRecSectorsIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({
			id: sectorDisasterRecordsRelationTable.id,
		})
		.from(sectorDisasterRecordsRelationTable)
		.innerJoin(
			disasterRecordsTable,
			eq(
				sectorDisasterRecordsRelationTable.disasterRecordId,
				disasterRecordsTable.id
			)
		)
		.where(
			and(
				eq(sectorDisasterRecordsRelationTable.apiImportId, importId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		)
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function disRecSectorsById(id: string) {
	return disRecSectorsByIdTx(dr, id);
}

export async function disRecSectorsByIdTx(tx: Tx, id: string) {
	let res = await tx.query.sectorDisasterRecordsRelationTable.findFirst({
		where: eq(sectorDisasterRecordsRelationTable.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	return res;
}

export async function disRecSectorsDeleteById(
	idStr: string
): Promise<DeleteResult> {
	await deleteByIdForStringId(idStr, sectorDisasterRecordsRelationTable);
	return { ok: true };
}

export async function sectorsFilderBydisasterRecordsId(ctx: BackendContext, idStr: string) {
	let id = idStr;

	const catTable = aliasedTable(sectorTable, "catTable");

	const res = await dr
		.select({
			disRecSectorsId: sectorDisasterRecordsRelationTable.id,
			disRecSectorsWithDamage: sectorDisasterRecordsRelationTable.withDamage,
			disRecSectorsDamageCost: sectorDisasterRecordsRelationTable.damageCost,
			disRecSectorsDamageCostCurrency:
				sectorDisasterRecordsRelationTable.damageCostCurrency,
			disRecSectorsDamageRecoveryCost:
				sectorDisasterRecordsRelationTable.damageRecoveryCost,
			disRecSectorsDamageRecoveryCostCurrency:
				sectorDisasterRecordsRelationTable.damageRecoveryCostCurrency,
			disRecSectorsWithDisruption:
				sectorDisasterRecordsRelationTable.withDisruption,
			disRecSectorsWithLosses: sectorDisasterRecordsRelationTable.withLosses,
			disRecSectorsLossesCost: sectorDisasterRecordsRelationTable.lossesCost,
			disRecSectorsLossesCostCurrency:
				sectorDisasterRecordsRelationTable.lossesCostCurrency,
			disRecSectorsdisasterRecordId:
				sectorDisasterRecordsRelationTable.disasterRecordId,
			disRecSectorsSectorId: sectorDisasterRecordsRelationTable.sectorId,
			catId: catTable.id,
			catName: sql<string>`${catTable.name}->>${ctx.lang}`.as('catname'),
			sectorTreeDisplay: sql`(
				WITH RECURSIVE ParentCTE AS (
					SELECT id, name->>${ctx.lang}, parent_id, sectorname AS full_path
					FROM sector
					WHERE id = ${sectorDisasterRecordsRelationTable.sectorId}

					UNION ALL

					SELECT t.id, t.name->>${ctx.lang}, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
					FROM sector t
					INNER JOIN ParentCTE p ON t.id = p.parent_id
				)
				SELECT full_path
				FROM ParentCTE
				WHERE parent_id IS NULL
			)`.as("sectorTreeDisplay"),
			sectorTreeDisplayIds: sql`(
				WITH RECURSIVE ParentCTE AS (
					SELECT id, sectorname, parent_id, CAST(id AS TEXT) AS full_path
					FROM sector
					WHERE id = ${sectorDisasterRecordsRelationTable.sectorId}

					UNION ALL

					SELECT t.id, t.sectorname, t.parent_id, CAST(t.id AS TEXT) || ' > ' || p.full_path AS full_path
					FROM sector t
					INNER JOIN ParentCTE p ON t.id = p.parent_id
				)
				SELECT full_path
				FROM ParentCTE
				WHERE parent_id IS NULL
			)`.as("sectorTreeDisplayIds"),
		})
		.from(sectorDisasterRecordsRelationTable)
		.leftJoin(
			catTable,
			eq(catTable.id, sectorDisasterRecordsRelationTable.sectorId)
		)
		.where(eq(sectorDisasterRecordsRelationTable.disasterRecordId, id))
		.orderBy(
			sql`(
				WITH RECURSIVE ParentCTE AS (
					SELECT id, name->>${ctx.lang}, parent_id, sectorname AS full_path
					FROM sector
					WHERE id = ${sectorDisasterRecordsRelationTable.sectorId}

					UNION ALL

					SELECT t.id, t.name->>${ctx.lang}, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
					FROM sector t
					INNER JOIN ParentCTE p ON t.id = p.parent_id
				)
				SELECT full_path
				FROM ParentCTE
				WHERE parent_id IS NULL
			)`
		)
		.execute();

	return res;
}

export async function sectorTreeDisplayText(sectorId: number) {
	let res1 = await dr.execute(sql`
		WITH RECURSIVE ParentCTE AS (
			SELECT id, sectorname, parent_id, sectorname AS full_path
			FROM sector
			WHERE id = ${sectorId}

			UNION ALL

			SELECT t.id, t.sectorname, t.parent_id, t.sectorname || ' > ' || p.full_path AS full_path
			FROM sector t
			INNER JOIN ParentCTE p ON t.id = p.parent_id
		)
		SELECT full_path
		FROM ParentCTE
		WHERE parent_id IS NULL;
	`);
	let sectorDisplay = res1.rows.map((r) => r.full_path as string);

	return sectorDisplay;
}

export async function upsertRecord(record: DisRecSectorsFields): Promise<void> {
	// Perform the upsert operation
	await dr
		.insert(sectorDisasterRecordsRelationTable)
		.values(record)
		.onConflictDoUpdate({
			target: sectorDisasterRecordsRelationTable.id,
			set: {
				sectorId: record.sectorId,
				disasterRecordId: record.disasterRecordId,
				withDamage: record.withDamage,
				damageCost: record.damageCost,
				damageCostCurrency: record.damageCostCurrency,
				damageRecoveryCost: record.damageRecoveryCost,
				damageRecoveryCostCurrency: record.damageRecoveryCostCurrency,
				withDisruption: record.withDisruption,
				withLosses: record.withLosses,
				lossesCost: record.lossesCost,
				lossesCostCurrency: record.lossesCostCurrency,
			},
		});

	await updateTotalsUsingDisasterRecordId(dr, record.disasterRecordId);
}
