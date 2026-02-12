import { dr, Tx } from "~/db.server";
import { assetTable, InsertAsset } from "~/drizzle/schema/assetTable";
import { eq, sql, inArray, and, or } from "drizzle-orm";
import { CreateResult, DeleteResult, UpdateResult } from "~/backend.server/handlers/form/form";
import { Errors, FormInputDef, hasErrors } from "~/frontend/form";
import { deleteByIdForStringId } from "./common";
import { BackendContext } from "../context";

export interface AssetFields
	extends Omit<
		InsertAsset,
		| "builtInName"
		| "customName"
		| "builtInCategory"
		| "customCategory"
		| "builtInNotes"
		| "customNotes"
	> {
	name: string;
	notes: string;
	category: string;
}
export async function fieldsDef(ctx: BackendContext): Promise<FormInputDef<AssetFields>[]> {
	return [
		{
			key: "sectorIds",
			label: ctx.t({ "code": "common.sector", "msg": "Sector" }),
			type: "other",
		},
		{
			key: "name",
			label: ctx.t({ "code": "common.name", "msg": "Name" }),
			type: "text",
			required: true,
		},
		{
			key: "category",
			label: ctx.t({ "code": "common.category", "msg": "Category" }),
			type: "text",
		},
		{
			key: "nationalId",
			label: ctx.t({ "code": "common.national_id", "msg": "National ID" }),
			type: "text",
		},
		{ key: "notes", label: ctx.t({ "code": "common.notes", "msg": "Notes" }), type: "textarea" },
	];
}

export async function fieldsDefApi(ctx: BackendContext): Promise<FormInputDef<AssetFields>[]> {
	return [...(await fieldsDef(ctx)), { key: "apiImportId", label: "", type: "other" }];
}

export async function fieldsDefView(ctx: BackendContext): Promise<FormInputDef<AssetFields>[]> {
	return await fieldsDef(ctx);
}

export function validate(_fields: Partial<AssetFields>): Errors<AssetFields> {
	let errors: Errors<AssetFields> = {};
	errors.fields = {};
	return errors;
}

export async function assetCreate(
	_ctx: BackendContext,
	tx: Tx,
	fields: AssetFields,
): Promise<CreateResult<AssetFields>> {
	const errors = validate(fields);
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	if (fields.isBuiltIn) {
		throw new Error("Attempted to modify builtin asset");
	}

	const insertValues: InsertAsset = {
		...fields,
		isBuiltIn: false,
		customName: fields.name,
		customCategory: fields.category,
		customNotes: fields.notes,
	};

	const res = await tx.insert(assetTable).values(insertValues).returning({ id: assetTable.id });

	return { ok: true, id: res[0].id };
}

export async function assetUpdate(
	_ctx: BackendContext,
	tx: Tx,
	idStr: string,
	fields: Partial<AssetFields>,
): Promise<UpdateResult<AssetFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let id = idStr;

	let res = await tx.query.assetTable.findFirst({
		where: eq(assetTable.id, id),
	});
	if (!res) {
		throw new Error(`Id is invalid: ${id}`);
	}

	if (res.isBuiltIn) {
		throw new Error("Attempted to modify builtin asset");
	}

	const updateValues: Partial<InsertAsset> = {
		...fields,
		customName: fields.name,
		customCategory: fields.category,
		customNotes: fields.notes,
	};

	await tx.update(assetTable).set(updateValues).where(eq(assetTable.id, id));

	return { ok: true };
}
export async function assetUpdateByIdAndCountryAccountsId(
	_ctx: BackendContext,
	tx: Tx,
	id: string,
	countryAccountsId: string,
	fields: Partial<AssetFields>,
): Promise<UpdateResult<AssetFields>> {
	let errors = validate(fields);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let res = await tx.query.assetTable.findFirst({
		where: and(eq(assetTable.id, id), eq(assetTable.countryAccountsId, countryAccountsId)),
	});
	if (!res) {
		throw new Error(`Id is invalid: ${id}`);
	}

	if (res.isBuiltIn) {
		throw new Error("Attempted to modify builtin asset");
	}

	await tx
		.update(assetTable)
		.set({
			...fields,
		})
		.where(eq(assetTable.id, id));

	return { ok: true };
}

export type AssetViewModel = AssetFields & { id: string };

export async function assetIdByImportId(tx: Tx, importId: string) {
	let res = await tx
		.select({
			id: assetTable.id,
		})
		.from(assetTable)
		.where(eq(assetTable.apiImportId, importId));

	if (res.length == 0) {
		return null;
	}

	return String(res[0].id);
}
export async function assetIdByImportIdAndCountryAccountsId(
	tx: Tx,
	importId: string,
	countryAccountsId: string,
) {
	let res = await tx
		.select({
			id: assetTable.id,
		})
		.from(assetTable)
		.where(
			and(
				eq(assetTable.apiImportId, importId),
				eq(assetTable.countryAccountsId, countryAccountsId),
			),
		);

	if (res.length == 0) {
		return null;
	}

	return String(res[0].id);
}

export async function assetById(ctx: BackendContext, id: string) {
	return assetByIdTx(ctx, dr, id);
}

export async function assetByIdTx(ctx: BackendContext, tx: Tx, id: string) {
	let res = await assetSelect(ctx, tx).where(eq(assetTable.id, id));

	if (!res || !res.length) {
		throw new Error("Id is invalid");
	}

	return res[0];
}

export async function assetDeleteById(
	idStr: string,
	countryAccountsId: string,
): Promise<DeleteResult> {
	let id = idStr;
	let res = await dr.query.assetTable.findFirst({
		where: and(eq(assetTable.id, id), eq(assetTable.countryAccountsId, countryAccountsId)),
	});
	if (!res) {
		throw new Error("Id is invalid");
	}
	if (res.isBuiltIn) {
		throw new Error("Attempted to delete builtin asset");
	}
	await deleteByIdForStringId(id, assetTable);
	return { ok: true };
}

export async function assetsForSector(
	ctx: BackendContext,
	tx: Tx,
	sectorId: string,
	countryAccountsId?: string,
) {
	// Build sector lineage (selected sector + its ancestors)
	const res1 = await tx.execute(sql`
		WITH RECURSIVE sector_rec AS (
			SELECT id, parent_id
			FROM sector
			WHERE id = ${sectorId}
			UNION ALL
			SELECT s.id, s.parent_id
			FROM sector s
			JOIN sector_rec rec ON rec.parent_id = s.id
		)
		SELECT a.id
		FROM asset a
		WHERE EXISTS (
			SELECT 1
			FROM sector_rec s
			WHERE s.id::text = ANY(string_to_array(a.sector_ids, ','))
		)
	`);

	// if we switch to using array
	// WHERE s.id = ANY(a.sector_ids)
	const assetIds = res1.rows.map((r) => r.id as string);

	// Base predicate: restrict to sector lineage
	const basePredicate = inArray(assetTable.id, assetIds);

	// Optional tenant filter: instance-owned OR built-in
	const tenantPredicate = countryAccountsId
		? or(eq(assetTable.countryAccountsId, countryAccountsId), eq(assetTable.isBuiltIn, true))
		: undefined;

	const res = await tx.query.assetTable.findMany({
		columns: {
			id: true,
		},
		extras: {
			name: sql<string>`CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${ctx.lang})
			ELSE ${assetTable.customName}
		END`.as("name"),
		},
		where: tenantPredicate ? and(basePredicate, tenantPredicate) : basePredicate,
		orderBy: [sql`name`],
	});
	return res;
}

export async function upsertRecord(record: InsertAsset): Promise<void> {
	// Perform the upsert operation
	if (record.id && record.id !== "" && record.id !== "undefined") {
		await dr
			.insert(assetTable)
			.values(record)
			.onConflictDoUpdate({
				target: [assetTable.apiImportId, assetTable.countryAccountsId],
				set: {
					id: record.id,
					customName: record.customName,
					sectorIds: record.sectorIds,
					isBuiltIn: record.isBuiltIn,
					nationalId: record.nationalId,
					customNotes: record.customNotes,
					customCategory: record.customCategory,
				},
			});
	} else {
		await dr
			.insert(assetTable)
			.values(record)
			.onConflictDoUpdate({
				target: [assetTable.apiImportId, assetTable.countryAccountsId],
				set: {
					customName: record.customName,
					sectorIds: record.sectorIds,
					isBuiltIn: record.isBuiltIn,
					nationalId: record.nationalId,
					customNotes: record.customNotes,
					customCategory: record.customCategory,
				},
			});
	}
}

function assetSelect(ctx: BackendContext, tx: Tx) {
	return tx
		.select({
			id: assetTable.id,
			name: nameExpr(ctx).as("name"),
			category: categoryExpr(ctx).as("category"),
			notes: notesExpr(ctx).as("notes"),

			sectorIds: assetTable.sectorIds,
			isBuiltIn: assetTable.isBuiltIn,
			nationalId: assetTable.nationalId,
			countryAccountsId: assetTable.countryAccountsId,
		})
		.from(assetTable);
}

export async function getBuiltInAssets(ctx: BackendContext) {
	const res = await assetSelect(ctx, dr).where(eq(assetTable.isBuiltIn, true));
	return res;
}

function nameExpr(ctx: BackendContext) {
	return sql<string>`
    CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInName}, ${ctx.lang})
      ELSE ${assetTable.customName}
    END
  `;
}

function categoryExpr(ctx: BackendContext) {
	return sql<string>`
    CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInCategory}, ${ctx.lang})
      ELSE ${assetTable.customCategory}
    END
  `;
}

function notesExpr(ctx: BackendContext) {
	return sql<string>`
    CASE
			WHEN ${assetTable.isBuiltIn} THEN dts_jsonb_localized(${assetTable.builtInNotes}, ${ctx.lang})
      ELSE ${assetTable.customNotes}
    END
  `;
}

export async function searchAssets(ctx: BackendContext, query: string) {
	return await assetSelect(ctx, dr).where(sql`lower(${nameExpr(ctx)}) ILIKE ${`%${query}%`}`);
}
