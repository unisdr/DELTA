import { dr, Tx } from "~/db.server";
import {
	devExample2Table,
	InsertDevExample2,
} from "~/drizzle/schema/devExample2Table";
import { and, eq } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForNumberId } from "./common";
import { BackendContext } from "../context";

export interface DevExample2Fields extends Omit<InsertDevExample2, "id"> {}

function repeatFields(
	n: number,
	page: number,
): FormInputDef<DevExample2Fields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;
		res.push(
			{
				key: "repeatableNum" + j,
				label: "Repeatable num " + j,
				type: "number",
				repeatable: { group: "r", index: i },
				page,
			},
			{
				key: "repeatableText" + j,
				label: "Repeatable text " + j,
				type: "text",
				repeatable: { group: "r", index: i },
				page,
			},
		);
	}
	return res as FormInputDef<DevExample2Fields>[];
}

export async function fieldsDef(): Promise<FormInputDef<DevExample2Fields>[]> {
	return [
		{
			key: "field1",
			label: "Field 1",
			type: "text",
			required: true,
			tooltip: "Field 1 tooltip",
			description: "Field 1 description",
			uiRow: {
				label: "Fields 1,2",
			},
			page: 1,
		},
		{ key: "field2", label: "Field 2", type: "text", required: true, page: 1 },
		{
			key: "field3",
			label: "Field 3",
			type: "number",
			required: true,
			uiRow: {
				label: "Fields 3,4",
			},
			page: 1,
		},
		{ key: "field4", label: "Field 4", type: "number", page: 1 },
		{
			key: "field6",
			label: "Field 6",
			type: "enum",
			required: true,
			enumData: [
				{ key: "one", label: "One" },
				{ key: "two", label: "Two" },
				{ key: "three", label: "Three" },
			],
			uiRowNew: true,
			page: 2,
		},
		{ key: "field7", label: "Field 7", type: "date", uiRowNew: true, page: 2 },
		{
			key: "field8",
			label: "Field 8",
			type: "date_optional_precision",
			uiRowNew: true,
			page: 2,
		},
		...repeatFields(3, 2),
		{
			key: "jsonData",
			label: "Field JSON data",
			type: "json",
			uiRowNew: true,
			page: 3,
		},
		{
			key: "formStatus",
			label: "Form Status",
			type: "enum",
			required: true,
			enumData: [
				{ key: "draft", label: "Draft" },
				{ key: "submitted", label: "Submitted" },
			],
			page: 3,
		},
	];
}

export async function fieldsDefApi(): Promise<
	FormInputDef<DevExample2Fields>[]
> {
	return [
		...(await fieldsDef()),
		{ key: "apiImportId", label: "", type: "other" },
	];
}

export async function fieldsDefView(): Promise<
	FormInputDef<DevExample2Fields>[]
> {
	return [
		...(await fieldsDef()),
		{ key: "countryAccountsId", label: "", type: "text" },
	];
}

export function validate(
	fields: Partial<DevExample2Fields>,
): Errors<DevExample2Fields> {
	let errors: Errors<DevExample2Fields> = {};
	errors.fields = {};
	if (fields.field3 !== undefined && fields.field3 <= 10) {
		errors.fields.field3 = ["Field3 must be >10"];
	}
	if (typeof fields.field4 == "number" && fields.field4 <= 10) {
		errors.fields.field4 = ["Field4 must be >10"];
	}
	return errors;
}

export async function devExample2Create(
	_ctx: BackendContext,
	tx: Tx,
	fields: DevExample2Fields,
	countryAccountsId?: string,
): Promise<CreateResult<DevExample2Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	if (countryAccountsId) {
		fields = { ...fields, countryAccountsId };
	}
	const res = await tx
		.insert(devExample2Table)
		.values({
			...fields,
		})
		.returning({ id: devExample2Table.id });

	return { ok: true, id: res[0].id };
}

export async function devExample2UpdateById(
	_ctx: BackendContext,
	tx: Tx,
	idStr: string,
	fields: Partial<DevExample2Fields>,
): Promise<UpdateResult<DevExample2Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	const fieldsToUpdate = Object.keys(fields).filter(
		(k) => fields[k as keyof DevExample2Fields] !== undefined,
	);
	if (fieldsToUpdate.length === 0) {
		return { ok: false, errors: { form: ["No fields to update"] } };
	}
	let id = idStr;
	const result = await tx
		.update(devExample2Table)
		.set({
			...fields,
		})
		.where(and(eq(devExample2Table.id, id)))
		.returning();

	if (result.length >= 0) {
		return { ok: true };
	}
	return { ok: false, errors: { general: ["DevExample2 not updated"] } };
}

export async function devExample2UpdateByIdAndCountryAccountsId(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<DevExample2Fields>,
): Promise<UpdateResult<DevExample2Fields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	const fieldsToUpdate = Object.keys(fields).filter(
		(k) => fields[k as keyof DevExample2Fields] !== undefined,
	);
	if (fieldsToUpdate.length === 0) {
		return { ok: false, errors: { form: ["No fields to update"] } };
	}
	const result = await tx
		.update(devExample2Table)
		.set({
			...fields,
		})
		.where(
			and(
				eq(devExample2Table.id, id),
				eq(devExample2Table.countryAccountsId, countryAccountsId),
			),
		)
		.returning();

	if (result.length >= 0) {
		return { ok: true };
	}
	return { ok: false, errors: { general: ["DevExample2 not updated"] } };
}

export type DevExample2ViewModel = Exclude<
	Awaited<ReturnType<typeof devExample2ById>>,
	undefined
>;

export async function devExample2IdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: devExample2Table.id,
		})
		.from(devExample2Table)
		.where(eq(devExample2Table.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}
export async function devExample2IdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string,
) {
	const res = await tx
		.select({
			id: devExample2Table.id,
		})
		.from(devExample2Table)
		.where(
			and(
				eq(devExample2Table.apiImportId, importId),
				eq(devExample2Table.countryAccountsId, countryAccountsId),
			),
		);
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function devExample2ById(ctx: BackendContext, idStr: string) {
	return devExample2ByIdTx(ctx, dr, idStr);
}

export async function devExample2ByIdTx(
	_ctx: BackendContext,
	tx: Tx,
	idStr: string,
) {
	let id = idStr;
	let res = await tx.query.devExample2Table.findFirst({
		where: eq(devExample2Table.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid or you don't have access");
	}
	return res;
}

export async function devExample2DeleteById(
	idStr: string,
): Promise<DeleteResult> {
	await deleteByIdForNumberId(idStr, devExample2Table);
	return { ok: true };
}

export async function devExample2DeleteByIdAndCountryAccounts(
	id: string,
	countryAccountsId: string,
): Promise<DeleteResult> {
	await dr.transaction(async (tx) => {
		const existingRecord = tx
			.select({})
			.from(devExample2Table)
			.where(
				and(
					eq(devExample2Table.id, id),
					eq(devExample2Table.countryAccountsId, countryAccountsId),
				),
			);
		if (!existingRecord) {
			throw new Error(`Record with ID ${id} not found`);
		}
		await tx.delete(devExample2Table).where(eq(devExample2Table.id, id));
	});
	return { ok: true };
}
