import { dr, Tx } from "~/db.server";
import {
	SelectOrganization,
	InsertOrganization,
	organizationTable,
} from "~/drizzle/schema";
import { and, eq } from "drizzle-orm";

import {
	CreateResult,
	DeleteResult,
	UpdateResult,
} from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
export interface OrganizationFields extends Omit<InsertOrganization, "id"> {}

export function getFieldsDef(
	
): FormInputDef<OrganizationFields>[] {
	return [
		{
			key: "name",
			label: "Name",
			type: "text",
			required: true,
		},
	];
}

export function getFieldsDefApi(): 
	FormInputDef<OrganizationFields>[] {
	const baseFields = getFieldsDef();
	return [...baseFields, { key: "apiImportId", label: "", type: "other" }];
}

export async function getFieldsDefView(): Promise<
	FormInputDef<OrganizationFields>[]
> {
	const baseFields = getFieldsDef();
	return [...baseFields];
}

export function validate(
	fields: Partial<OrganizationFields>
): Errors<OrganizationFields> {
	let errors: Errors<OrganizationFields> = {};
	errors.fields = {};

	let check = (k: keyof OrganizationFields, msg: string) => {
		if (fields[k] != null) {
			errors.fields![k] = [msg];
		}
	};

	return errors;
}

export async function organizationCreate(
	tx: Tx,
	fields: OrganizationFields
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
	tx: Tx,
	id: string,
	fields: Partial<OrganizationFields>
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

export async function organizationUpdateByIdAndCountryAccountsId(
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<OrganizationFields>
): Promise<UpdateResult<OrganizationFields>> {
	let errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	// let recordId = await getRecordId(tx, id);

	// const disasterRecords = getDisasterRecordsByIdAndCountryAccountsId(
	// 	recordId,
	// 	countryAccountsId
	// );
	// if (!disasterRecords) {
	// 	return {
	// 		ok: false,
	// 		errors: {
	// 			general: ["No matching disaster record found or you don't have access"],
	// 		},
	// 	};
	// }

	await tx
		.update(organizationTable)
		.set({
			...fields,
		})
		.where(and(eq(organizationTable.id, id)));

	return { ok: true };
}

export type OrganizationViewModel = Exclude<
	Awaited<ReturnType<typeof organizationById>>,
	undefined
>;

export async function organizationIdByImportId(tx: Tx, importId: string) {
	const res = await tx
		.select({
			id: organizationTable.id,
		})
		.from(organizationTable)
		.where(eq(organizationTable.apiImportId, importId));
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function organizationIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string
) {
	const res = await tx
		.select({
			id: organizationTable.id,
		})
		.from(organizationTable)
		// .innerJoin(
		// 	organizationTable,
		// 	eq(organizationTable.sectorId, organizationTable.id)
		// )
		.where(
			and(
				eq(organizationTable.apiImportId, importId),
				eq(organizationTable.countryAccountsId, countryAccountsId)
			)
		);
	if (res.length == 0) {
		return null;
	}
	return String(res[0].id);
}

export async function organizationById(idStr: string) {
	return organizationByIdTx(dr, idStr);
}

export async function organizationByIdTx(tx: Tx, id: string) {
	let res = await tx.query.organizationTable.findFirst({
		where: eq(organizationTable.id, id),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	return res;
}

export async function organizationDeleteById(id: string): Promise<DeleteResult> {
	await deleteByIdForStringId(id, organizationTable);
	return { ok: true };
}


