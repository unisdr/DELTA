import { dr, Tx } from "~/db.server";
import {
	SelectOrganization,
	InsertOrganization,
	organizationTable,
} from "~/drizzle/schema/organizationTable";
import { and, eq, desc } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { DContext } from "~/utils/dcontext";
import { BackendContext } from "../context";

export interface OrganizationFields extends Omit<InsertOrganization, "id"> {}

export async function getFieldsDef(
	ctx: DContext,
): Promise<FormInputDef<OrganizationFields>[]> {
	return [
		{
			key: "name",
			label: ctx.t({ code: "common.name", msg: "Name" }),
			type: "text",
			required: true,
		},
	];
}

export async function getFieldsDefApi(
	ctx: DContext,
): Promise<FormInputDef<OrganizationFields>[]> {
	const baseFields = await getFieldsDef(ctx);
	return [...baseFields, { key: "apiImportId", label: "", type: "other" }];
}

export async function getFieldsDefView(
	ctx: DContext,
): Promise<FormInputDef<OrganizationFields>[]> {
	const baseFields = await getFieldsDef(ctx);
	return [...baseFields];
}

export async function fieldsDefView(
	ctx: DContext,
): Promise<FormInputDef<OrganizationFields>[]> {
	return [...(await getFieldsDef(ctx))];
}

export function validate(
	fields: Partial<OrganizationFields>,
): Errors<OrganizationFields> {
	let errors: Errors<OrganizationFields> = {};
	errors.fields = {};

	let check = (k: keyof OrganizationFields, msg: string) => {
		if (fields[k] != null) {
			errors.fields![k] = [msg];
		}
	};

	if (fields.name == null || fields.name == "") {
		check("name", "Name is required");
	}

	return errors;
}

export async function organizationCreate(
	_ctx: BackendContext,
	tx: Tx,
	fields: OrganizationFields,
): Promise<CreateResult<OrganizationFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const res = await tx
		.insert(organizationTable)
		.values({
			...fields,
		})
		.returning({ id: organizationTable.id });

	return { ok: true, id: res[0].id };
}

export async function organizationUpdate(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	fields: Partial<OrganizationFields>,
): Promise<UpdateResult<OrganizationFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	await tx
		.update(organizationTable)
		.set({
			...fields,
		})
		.where(eq(organizationTable.id, id));

	return { ok: true };
}

export type PartialOrganization = Pick<SelectOrganization, "id" | "name">;
export async function getOrganizationsByCountryAccountsId(
	countryAccountId: string,
): Promise<PartialOrganization[]> {
	try {
		const organizationsRecords = await dr
			.select({
				id: organizationTable.id,
				name: organizationTable.name,
			})
			.from(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountId))
			.orderBy(desc(organizationTable.updatedAt));

		return organizationsRecords;
	} catch (error) {
		throw new Error("Failed to fetch organizations");
	}
}

export type OrganizationViewModel = Exclude<
	Awaited<ReturnType<typeof organizationById>>,
	undefined
>;

export async function organizationIdByImportId(
	tx: Tx,
	importId: string,
	countryAccountsId: string,
) {
	const res = await tx
		.select({
			id: organizationTable.id,
		})
		.from(organizationTable)
		.where(
			and(
				eq(organizationTable.apiImportId, importId),
				eq(organizationTable.countryAccountsId, countryAccountsId),
			),
		);
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function organizationById(ctx: BackendContext, idStr: string) {
	return organizationByIdTx(ctx, dr, idStr);
}

export async function organizationByIdTx(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
) {
	let res = await tx.query.organizationTable.findFirst({
		where: and(eq(organizationTable.id, id)),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	return res;
}

export async function organizationDeleteById(
	id: string,
	countryAccountsId: string,
): Promise<DeleteResult> {
	let res = await dr.query.organizationTable.findFirst({
		where: and(
			eq(organizationTable.id, id),
			eq(organizationTable.countryAccountsId, countryAccountsId),
		),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}

	await deleteByIdForStringId(id, organizationTable);
	return { ok: true };
}
