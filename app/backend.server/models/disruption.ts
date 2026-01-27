import { dr, Tx } from "~/db.server";
import {
	disruptionTable,
	DisruptionInsert,
	disasterRecordsTable,
} from "~/drizzle/schema";
import { and, eq } from "drizzle-orm";

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
import { DContext } from "~/util/dcontext";
export interface DisruptionFields extends Omit<DisruptionInsert, "id"> {}

export function getFieldsDef(
	ctx: DContext,
	currencies?: string[]
): FormInputDef<DisruptionFields>[] {
	if (!currencies) {
		currencies = [];
	}
	return [
		{ key: "recordId", label: "", type: "uuid" },
		{ key: "sectorId", label: "", type: "other" },
		{
			key: "durationDays",
			label: ctx.t({
				"code": "disaster_records.disruption.duration_days",
				"msg": "Duration (days)"
			}),
			type: "number",
			uiRow: {},
		},

		{
			key: "durationHours",
			label: ctx.t({
				"code": "disaster_records.disruption.duration_hours",
				"msg": "Duration (hours)"
			}),
			type: "number"
		},
		{
			key: "usersAffected",
			label: ctx.t({
				"code": "disaster_records.disruption.number_of_users_affected",
				"msg": "Number of users affected"
			}),
			type: "number"
		},
		{
			key: "peopleAffected",
			label: ctx.t({
				"code": "disaster_records.disruption.number_of_people_affected",
				"msg": "Number of people affected"
			}),
			type: "number"
		},
		{
			key: "comment",
			label: ctx.t({
				"code": "disaster_records.disruption.add_comments",
				"msg": "Add comments"
			}),
			type: "textarea",
			uiRowNew: true
		},
		{
			key: "responseOperation",
			label: ctx.t({
				"code": "disaster_records.disruption.response_operation",
				"msg": "Response operation"
			}),
			type: "textarea"
		},
		{
			key: "responseCost",
			label: ctx.t({
				"code": "disaster_records.disruption.response_cost",
				"msg": "Response cost"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "responseCurrency",
			label: ctx.t({
				"code": "disaster_records.disruption.currency",
				"msg": "Currency"
			}),
			type: "enum-flex",
			enumData: currencies.map((c) => {
				return { key: c, label: c };
			}),
		},
		{
			key: "spatialFootprint",
			label: ctx.t({
				"code": "common.spatial_footprint",
				"msg": "Spatial footprint"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: ctx.t({
				"code": "common.attachments",
				"msg": "Attachments"
			}),
			type: "other",
			psqlType: "jsonb",
		}
	];
}

export function getFieldsDefApi(ctx: DContext):
	FormInputDef<DisruptionFields>[] {
	const baseFields = getFieldsDef(ctx);
	return [...baseFields, { key: "apiImportId", label: "", type: "other" }];
}

export async function getFieldsDefView(ctx: DContext): Promise<
	FormInputDef<DisruptionFields>[]
> {
	const baseFields = getFieldsDef(ctx);
	return [...baseFields];
}

export function validate(
	ctx: BackendContext,
	fields: Partial<DisruptionFields>
): Errors<DisruptionFields> {
	let errors: Errors<DisruptionFields> = {};
	errors.fields = {};

	let check = (k: keyof DisruptionFields, msg: string) => {
		if (fields[k] != null && (fields[k] as number) < 0) {
			errors.fields![k] = [msg];
		}
	};

	check("durationDays", ctx.t({ "code": "disaster_records.disruption.duration_days_must_be_gte_zero", "msg": "Duration (days) must be >= 0" }));
	check("durationHours", ctx.t({ "code": "disaster_records.disruption.duration_hours_must_be_gte_zero", "msg": "Duration (hours) must be >= 0" }));
	check("usersAffected", ctx.t({ "code": "disaster_records.disruption.users_affected_must_be_gte_zero", "msg": "Users affected must be >= 0" }));
	check("responseCost", ctx.t({ "code": "disaster_records.disruption.response_cost_must_be_gte_zero", "msg": "Response cost must be >= 0" }));


	return errors;
}

export async function disruptionCreate(
	ctx: BackendContext,
	tx: Tx,
	fields: DisruptionFields
): Promise<CreateResult<DisruptionFields>> {
	let errors = validate(ctx, fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const res = await tx
		.insert(disruptionTable)
		.values({
			...fields,
		})
		.returning({ id: disruptionTable.id });

	await updateTotalsUsingDisasterRecordId(tx, fields.recordId);

	return { ok: true, id: res[0].id };
}

export async function disruptionUpdate(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	fields: Partial<DisruptionFields>
): Promise<UpdateResult<DisruptionFields>> {
	let errors = validate(ctx, fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	await tx
		.update(disruptionTable)
		.set({
			...fields,
		})
		.where(eq(disruptionTable.id, id));

	let recordId = await getRecordId(tx, id);
	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function disruptionUpdateByIdAndCountryAccountsId(
	ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DisruptionFields>
): Promise<UpdateResult<DisruptionFields>> {
	let errors = validate(ctx, fields);
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

	await tx
		.update(disruptionTable)
		.set({
			...fields,
		})
		.where(and(eq(disruptionTable.id, id)));

	await updateTotalsUsingDisasterRecordId(tx, recordId);

	return { ok: true };
}

export async function getRecordId(tx: Tx, id: string) {
	let rows = await tx
		.select({
			recordId: disruptionTable.recordId,
		})
		.from(disruptionTable)
		.where(eq(disruptionTable.id, id))
		.execute();
	if (!rows.length) throw new Error("not found by id");
	return rows[0].recordId;
}

export type DisruptionViewModel = Exclude<
	Awaited<ReturnType<typeof disruptionById>>,
	undefined
>;

export async function disruptionIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: disruptionTable.id,
		})
		.from(disruptionTable)
		.where(eq(disruptionTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}
export async function disruptionIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({
			id: disruptionTable.id,
		})
		.from(disruptionTable)
		.innerJoin(
			disasterRecordsTable,
			eq(disruptionTable.sectorId, disasterRecordsTable.id)
		)
		.where(
			and(
				eq(disruptionTable.apiImportId, importId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
			)
		);
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function disruptionById(ctx: BackendContext, idStr: string) {
	return disruptionByIdTx(ctx, dr, idStr);
}

export async function disruptionByIdTx(_ctx: BackendContext, tx: Tx, id: string) {
	let res = await tx.query.disruptionTable.findFirst({
		where: eq(disruptionTable.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	return res;
}

export async function disruptionDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, disruptionTable);
	return { ok: true };
}

export async function disruptionDeleteBySectorId(
	id: string
): Promise<DeleteResult> {
	await dr.delete(disruptionTable).where(eq(disruptionTable.sectorId, id));

	return { ok: true };
}
