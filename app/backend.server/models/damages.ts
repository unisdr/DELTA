import { dr, Tx } from "~/db.server";
import {
	assetTable,
	damagesTable,
	DamagesInsert,
	disasterRecordsTable,
} from "~/drizzle/schema";
import { sql, and, eq } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { unitsEnum } from "~/frontend/unit_picker";
import { updateTotalsUsingDisasterRecordId } from "./analytics/disaster-events-cost-calculator";
import { getDisasterRecordsByIdAndCountryAccountsId } from "~/db/queries/disasterRecords";
import { BackendContext } from "../context";

export interface DamagesFields extends Omit<DamagesInsert, "id"> {}

export function fieldsForPd(
	ctx: BackendContext,
	pre: "pd" | "td",
	currencies?: string[]
): FormInputDef<DamagesFields>[] {
	let repairOrReplacement = pre == "pd" ? "Repair" : "Replacement";
	if (!currencies) {
		currencies = [];
	}
	return [
		{
			key: (pre + "DamageAmount") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.amount_of_units",
				"msg": "Amount of units"
			}),
			type: "number",
			uiRow: {},
		},
		{
			key: (pre + repairOrReplacement + "CostUnit") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.unit_repair_or_replacement_cost",
				"msg": "Unit {repairOrReplacement} cost"
			}, { repairOrReplacement: repairOrReplacement.toLowerCase() }),
			type: "money",
			uiRow: {},
		},
		{
			key: (pre + repairOrReplacement + "CostUnitCurrency") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.currency",
				"msg": "Currency"
			}),
			type: "enum-flex",
			enumData: currencies.map((c) => ({ key: c, label: c })),
		},
		{
			key: (pre + repairOrReplacement + "CostTotal") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.total_repair_or_replacement_cost",
				"msg": "Total {repairOrReplacement} cost"
			}, { repairOrReplacement: repairOrReplacement.toLowerCase() }),
			type: "money",
		},
		{
			key: (pre + repairOrReplacement + "CostTotalOverride") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.override",
				"msg": "Override"
			}),
			type: "bool",
		},
		{
			key: (pre + "RecoveryCostUnit") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.unit_recovery_cost",
				"msg": "Unit recovery cost"
			}),
			type: "money",
			uiRow: {},
		},



		{
			key: (pre + "RecoveryCostUnitCurrency") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.currency",
				"msg": "Currency"
			}),
			type: "enum-flex",
			enumData: currencies.map((c) => ({ key: c, label: c })),
		},
		{
			key: (pre + "RecoveryCostTotal") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.total_recovery_cost",
				"msg": "Total recovery cost"
			}),
			type: "money",
		},
		{
			key: (pre + "RecoveryCostTotalOverride") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.override",
				"msg": "Override"
			}),
			type: "bool",
		},
		{
			key: (pre + "DisruptionDurationDays") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.duration_days",
				"msg": "Duration (days)"
			}),
			type: "number",
			uiRow: {},
		},
		{
			key: (pre + "DisruptionDurationHours") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.duration_hours",
				"msg": "Duration (hours)"
			}),
			type: "number",
		},
		{
			key: (pre + "DisruptionUsersAffected") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.number_of_users_affected",
				"msg": "Number of users affected"
			}),
			type: "number",
		},
		{
			key: (pre + "DisruptionPeopleAffected") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.number_of_people_affected",
				"msg": "Number of people affected"
			}),
			type: "number",
		},
		{
			key: (pre + "DisruptionDescription") as keyof DamagesFields,
			label: ctx.t({
				"code": "disaster_record.damages.comment",
				"msg": "Comment"
			}),
			type: "textarea",
			uiRowNew: true,
		}
	];
}

export async function fieldsDef(
	ctx: BackendContext,
	currencies?: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	let currency = "";
	if (currencies && currencies.length > 0) {
		currency = currencies[0];
	}

	return [
		{ key: "recordId", label: "", type: "uuid" },
		{ key: "sectorId", label: "", type: "other" },
		{
			key: "assetId",
			label: ctx.t({
				"code": "disaster_record.damages.assets",
				"msg": "Assets"
			}),
			type: "uuid"
		},
		{
			key: "unit",
			label: ctx.t({
				"code": "disaster_record.damages.unit",
				"msg": "Unit"
			}),
			type: "enum",
			enumData: unitsEnum
		},
		{
			key: "totalDamageAmount",
			label: ctx.t({
				"code": "disaster_record.damages.total_damage_amount",
				"msg": "Total number of assets affected (partially damaged + totally destroyed)"
			}),
			type: "number",
			uiRow: {},
		},
		{
			key: "totalDamageAmountOverride",
			label: ctx.t({
				"code": "disaster_record.damages.override",
				"msg": "Override"
			}),
			type: "bool"
		},
		{
			key: "totalRecovery",
			label: ctx.t({
				"code": "disaster_record.damages.total_recovery",
				"msg": "Total recovery cost ({currency})"
			}, { currency }),
			type: "money",
		},
		{
			key: "totalRecoveryOverride",
			label: ctx.t({
				"code": "disaster_record.damages.override",
				"msg": "Override"
			}),
			type: "bool"
		},
		{
			key: "totalRepairReplacement",
			label: ctx.t({
				"code": "disaster_record.damages.total_repair_replacement",
				"msg": "Total damage in monetary terms (total repair + replacement cost) ({currency})"
			}, { currency }),
			type: "money"
		},
		{
			key: "totalRepairReplacementOverride",
			label: ctx.t({
				"code": "disaster_record.damages.override",
				"msg": "Override"
			}),
			type: "bool"
		},

		// Partially destroyed
		...fieldsForPd(ctx, "pd", currencies),
		// Totally damaged
		...fieldsForPd(ctx, "td", currencies),

		{
			key: "spatialFootprint",
			label: ctx.t({
				"code": "spatial_footprint",
				"msg": "Spatial footprint"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: ctx.t({
				"code": "attachments",
				"msg": "Attachments"
			}),
			type: "other",
			psqlType: "jsonb",
		}
	];
}

export async function fieldsDefApi(
	ctx: BackendContext,
	currencies: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	return [
		...(await fieldsDef(ctx, currencies)),
		{ key: "apiImportId", label: "", type: "other" },
	];
}

export async function fieldsDefView(
	ctx: BackendContext,
	currencies: string[]
): Promise<FormInputDef<DamagesFields>[]> {
	return fieldsDef(ctx, currencies);
}

export function validate(
	fields: Partial<DamagesFields>
): Errors<DamagesFields> {
	let errors: Errors<DamagesFields> = { fields: {} };
	let msg = "must be >= 0";
	let check = (k: keyof DamagesFields) => {
		if (fields[k] != null && (fields[k] as number) < 0)
			errors.fields![k] = [msg];
	};
	let keys = [
		"totalDamageAmount",
		"totalRepairReplacementRecovery",
		"pdRepairCostUnit",
		"pdRepairUnits",
		"pdRepairCostTotal",
		"pdRecoveryCostUnit",
		"pdRecoveryUnits",
		"pdRecoveryCostTotal",
		"pdDisruptionDurationDays",
		"pdDisruptionDurationHours",
		"pdDisruptionUsersAffected",
		"pdDisruptionPeopleAffected",
		"tdReplacementCostUnit",
		"tdReplacementUnits",
		"tdReplacementCostTotal",
		"tdRecoveryCostUnit",
		"tdRecoveryUnits",
		"tdRecoveryCostTotal",
		"tdDisruptionDurationDays",
		"tdDisruptionDurationHours",
		"tdDisruptionUsersAffected",
		"tdDisruptionPeopleAffected",
	];
	keys.forEach((k) => check(k as keyof DamagesFields));
	return errors;
}

export async function damagesCreate(
	_ctx: BackendContext,
	tx: Tx,
	fields: DamagesFields
): Promise<CreateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

	const res = await tx
		.insert(damagesTable)
		.values({ ...fields })
		.returning({ id: damagesTable.id });

	await updateTotalsUsingDisasterRecordId(tx, fields.recordId);

	return { ok: true, id: res[0].id };
}

export async function damagesUpdate(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	fields: Partial<DamagesFields>
): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

	await tx
		.update(damagesTable)
		.set({ ...fields })
		.where(eq(damagesTable.id, id));

	let recordId = await getRecordId(tx, id);
	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}
export async function damagesUpdateByIdAndCountryAccountsId(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DamagesFields>
): Promise<UpdateResult<DamagesFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) return { ok: false, errors };

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

	await tx
		.update(damagesTable)
		.set({ ...fields })
		.where(eq(damagesTable.id, id));

	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function getRecordId(tx: Tx, id: string) {
	let rows = await tx
		.select({
			recordId: damagesTable.recordId,
		})
		.from(damagesTable)
		.where(eq(damagesTable.id, id))
		.execute();
	if (!rows.length) throw new Error("not found by id");
	return rows[0].recordId;
}

export async function damagesIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({ id: damagesTable.id })
		.from(damagesTable)
		.where(eq(damagesTable.apiImportId, importId));
	return res.length == 0 ? null : String(res[0].id);
}
export async function damagesIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({ id: damagesTable.id })
		.from(damagesTable)
		.innerJoin(
			disasterRecordsTable,
			eq(damagesTable.sectorId, disasterRecordsTable.id)
		)
		.where(
			and(
				eq(damagesTable.apiImportId, importId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	return res.length == 0 ? null : String(res[0].id);
}

export type DamagesViewModel = Exclude<
	Awaited<ReturnType<typeof damagesById>>,
	undefined
>;
export async function damagesById(ctx: BackendContext, id: string) {
	return damagesByIdTx(ctx, dr, id)
}

export async function damagesByIdTx(ctx: BackendContext, tx: Tx, id: string) {
	let res = await tx.query.damagesTable.findFirst({
		where: eq(damagesTable.id, id),
		with: {
			asset: {
				columns: {
					id: true,
				},
				extras: {
					name: sql<string>`CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${ctx.lang})
			ELSE ${assetTable.customName}
		END`.as("name"),
				}
			}
		},
	});
	if (!res) throw new Error("Id is invalid");
	return res;
}

export async function damagesDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, damagesTable);
	return { ok: true };
}

export async function damagesDeleteBySectorId(
	id: string
): Promise<DeleteResult> {
	await dr.delete(damagesTable).where(eq(damagesTable.sectorId, id));

	return { ok: true };
}
