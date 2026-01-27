import { dr, Tx } from "~/db.server";

import { Errors, FormInputDef } from "~/frontend/form";

import {
	validateFromJson,
	validateFromJsonFull,
} from "~/frontend/form_validate";

import {
	CreateResult,
	ObjectWithImportId,
	SaveResult,
	UpdateResult,
	UpsertResult,
} from "./form";

import {
	upsertApiImportIdMissingError,
	updateMissingIDError,
	errorForForm,
} from "./form_utils";
import { BackendContext } from "~/backend.server/context";
import { divisionById, getAllIdOnly, getParent } from "~/backend.server/models/division";
import { isAssetInSectorByAssetId } from "~/backend.server/handlers/asset";

export interface JsonCreateArgs<T> {
	ctx: BackendContext;
	data: any;
	fieldsDef: FormInputDef<T>[];
	create: (ctx: BackendContext, tx: Tx, data: T) => Promise<SaveResult<T>>;
	countryAccountsId: string;
	tableName?: string; // database table name, requires specific validation for damage table
}

export interface JsonCreateRes<T> {
	ok: boolean;
	res: {
		id: string | null;
		errors?: Errors<T>;
	}[];
	error?: string;
}

export async function jsonCreate<T>(
	args: JsonCreateArgs<T>,
): Promise<JsonCreateRes<T>> {
	const ctx = args.ctx;

	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: { id: string | null; errors?: Errors<T> }[] = [];

	const fail = function () {
		throw "fail";
	};

	try {
		await dr.transaction(async (tx) => {
			for (const item of args.data) {
				// post process spatial data - geographic level before sending for validation
				if (item.spatialFootprint) {
					item.spatialFootprint = await spatialFootprintPostProcess(item.spatialFootprint, args);
				}

				// specific validataion for damage table 
				if (args.tableName === "damages" && (item.sectorId || item.assetId)) {
					await validateDamageAssetSector(ctx, item, args.countryAccountsId).then((errors) => {
						if (errors) {
							res.push({
								id: null,
								errors: errors as Errors<T>,
							});
							return fail();
						}
					});			
				}


				const validateRes = validateFromJsonFull(item, args.fieldsDef, true, args.tableName);
				if (!validateRes.ok) {
					res.push({ id: null, errors: validateRes.errors });
					return fail();
				}
				const one = await args.create(ctx, tx, validateRes.resOk!);
				if (!one.ok) {
					res.push({ id: null, errors: one.errors });
					return fail();
				}
				res.push({ id: one.id });
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res: res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonUpsertArgs<T extends ObjectWithImportId> {
	ctx: BackendContext;
	data: any;
	fieldsDef: FormInputDef<T>[];
	create: (ctx: BackendContext, tx: Tx, data: T) => Promise<CreateResult<T>>;
	update: (ctx: BackendContext, tx: Tx, id: string, data: Partial<T>) => Promise<UpdateResult<T>>;
	idByImportIdAndCountryAccountsId: (tx: Tx, importId: string, countryAccountsId: string) => Promise<string | null>;
	countryAccountsId: string;
	tableName?: string; // database table name, requires specific validation for damage table
}

export interface JsonUpsertRes<T> {
	ok: boolean;
	res: UpsertResult<T>[];
	error?: string;
}

export async function jsonUpsert<T extends ObjectWithImportId>(
	args: JsonUpsertArgs<T>
): Promise<JsonUpsertRes<T>> {
	const ctx = args.ctx;

	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: UpsertResult<T>[] = [];

	try {
		await dr.transaction(async (tx) => {
			const fail = function () {
				throw "fail";
			};

			for (const item of args.data) {
				if (!item.apiImportId) {
					res.push(errorForForm(upsertApiImportIdMissingError));
					return fail();
				}

				// post process spatial data - geographic level before sending for validation
				if (item.spatialFootprint) {
					item.spatialFootprint = await spatialFootprintPostProcess(item.spatialFootprint, args);
				}

				// specific validataion for damage table 
				if (args.tableName === "damages" && (item.sectorId || item.assetId)) {
					await validateDamageAssetSector(ctx, item, args.countryAccountsId).then((errors) => {
						if (errors) {
							res.push({
								ok: false,
								errors: errors as Errors<T>,
							});
							return fail();
						}
					});			
				}

				const validateRes = validateFromJsonFull(item, args.fieldsDef, true);
				if (!validateRes.ok) {
					res.push({ ok: false, errors: validateRes.errors });
					return fail();
				}

				const existingId = await args.idByImportIdAndCountryAccountsId(tx, item.apiImportId, args.countryAccountsId);

				if (existingId) {
					const updateRes = await args.update(
						ctx,
						tx,
						existingId,
						validateRes.resOk!
					);
					if (!updateRes.ok) {
						res.push({ ok: false, errors: updateRes.errors });
						return fail();
					}
					res.push({ ok: true, status: "update", id: existingId });
				} else {
					const createRes = await args.create(ctx, tx, validateRes.resOk!);
					if (!createRes.ok) {
						res.push({ ok: false, errors: createRes.errors });
						return fail();
					}
					res.push({ ok: true, status: "create", id: createRes.id });
				}
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonUpdateArgs<T> {
	ctx: BackendContext;
	data: any;
	fieldsDef: FormInputDef<T>[];
	update: (
		ctx: BackendContext,
		tx: Tx,
		id: string,
		countryAccountsId: string,
		data: Partial<T>
	) => Promise<SaveResult<T>>;
	countryAccountsId: string;
	tableName?: string; // database table name, requires specific validation for damage table
}

export interface JsonUpdateRes<T> {
	ok: boolean;
	res: {
		errors?: Errors<T>;
	}[];
	error?: string;
}

export async function jsonUpdate<T>(
	args: JsonUpdateArgs<T>
): Promise<JsonUpdateRes<T>> {
	const ctx = args.ctx;
	if (!Array.isArray(args.data)) {
		return {
			ok: false,
			res: [],
			error: "Data must be an array of objects",
		};
	}

	const res: { ok: boolean; errors?: Errors<T> }[] = [];

	try {
		await dr.transaction(async (tx) => {
			const fail = function () {
				throw "fail";
			};

			for (const item of args.data) {
				if (
					typeof item !== "object" ||
					!item.id ||
					typeof item.id !== "string"
				) {
					res.push({
						ok: false,
						errors: {
							form: [updateMissingIDError],
						} as Errors<T>,
					});
					return fail();
				}

				let id = item.id;
				delete item.id;

				// post process spatial data - geographic level before sending for validation
				if (item.spatialFootprint) {
					item.spatialFootprint = await spatialFootprintPostProcess(item.spatialFootprint, args);
				}

				// specific validataion for damage table 
				if (args.tableName === "damages" && (item.sectorId || item.assetId)) {
					await validateDamageAssetSector(ctx, item, args.countryAccountsId).then((errors) => {
						if (errors) {
							res.push({
								ok: false,
								errors: errors as Errors<T>,
							});
							return fail();
						}
					});			
				}

				const validateRes = validateFromJson(item, args.fieldsDef, true, true, args.tableName);

				if (!validateRes.ok) {
					res.push({ ok: false, errors: validateRes.errors });
					return fail();
				}

				const one = await args.update(ctx, tx, id, args.countryAccountsId, validateRes.resOk!);

				if (!one.ok) {
					res.push({ ok: false, errors: one.errors });
					return fail();
				}
				res.push({ ok: true });
			}
		});
	} catch (error) {
		if (error == "fail") {
			return { ok: false, res };
		} else {
			throw error;
		}
	}

	return {
		ok: true,
		res,
	};
}

export interface JsonApiDocsArgs<T> {
	ctx: BackendContext;
	baseUrl: string;
	fieldsDef: FormInputDef<T>[];
}

function jsonPayloadExample<T>(
	fieldsDef: FormInputDef<T>[]
): Record<string, any> {
	let data: Record<string, any> = {};

	for (let item of fieldsDef) {
		let val: any;
		switch (item.type) {
			case "text":
			case "textarea":
			case "other":
				val = "example string";
				break;
			case "uuid":
				val = "f41bd013-23cc-41ba-91d2-4e325f785171";
				break;
			case "date":
				val = new Date().toISOString();
				break;
			case "date_optional_precision":
				val = "2025-12-30";
				break;
			case "number":
				val = 123;
				break;
			case "bool":
				val = true;
				break;
			case "enum":
			case "enum-flex":
				if (item.enumData!.length) {
					val = item.enumData![0].key;
				} else {
					val = "";
				}
				break;
			case "approval_status":
				val = "draft";
				break;
			case "json":
				val = { k: "any json" };
				break;
			case "money":
				val = "100.01"
				break
			default:
				val = null;
		}

		data[item.key as string] = val;
	}

	return data;
}

export async function jsonApiDocs<T>(
	args: JsonApiDocsArgs<T>
): Promise<string> {
	const ctx = args.ctx;

	let parts: string[] = [];
	let line = function (s: string) {
		parts.push(s);
		parts.push("\n");
	};

	let docForEndpoint = function (
		name: string,
		urlPart: string,
		desc: string,
		list?: boolean
	) {
		line("");
		line("## " + name);
		let path = "/" + ctx.lang + "/api/" + args.baseUrl + "/" + urlPart;
		line(path);
		line(desc);
		line("# Example ");

		let url = ctx.fullUrl(path);

		line(`export DTS_KEY=YOUR_KEY`);

		if (list) {
			url += "?page=1";
			line(`curl -H "X-Auth:$DTS_KEY" '${url}'`);
		} else {
			let payload = jsonPayloadExample(args.fieldsDef);
			if (urlPart == "update") {
				payload = {
					id: "01308f4d-a94e-41c9-8410-0321f7032d7c",
					...payload,
				};
			}
			let payloadJSON = JSON.stringify(payload, null, 2);
			line(`curl -H "X-Auth:$DTS_KEY" ${url} -d '[${payloadJSON}]'`);
		}
	};

	line("# Endpoints");
	docForEndpoint(
		"Add",
		"add",
		"Adds new records and returns ids, pass all required fields. Use for initial import only."
	);
	docForEndpoint(
		"Update",
		"update",
		"Updates records by id, id is required, only fields that are passed are updated. Use for updates once initial import is done."
	);
	// docForEndpoint(
	// 	"Upsert",
	// 	"upsert",
	// 	"Based on apiImportId either creates a new record or updates existing one, pass all fields. Use for initial import only, more convenient that update if you want to import multiple times or for development."
	// );
	docForEndpoint("List", "list", "List records.", true);

	line("");
	line("# Fields");
	let fieldsDefJSON = JSON.stringify(args.fieldsDef, null, 2);
	line(fieldsDefJSON);

	return parts.join("");
}


interface propsSpatialFootprint {
	id: string; 
	title: string; 
	division_id?: string; 
	geojson?: object; 
	map_option: string;
	geographic_level?: string;
}

/**
 * Post-processes an array of spatial footprint objects, enriching them with geojson and geographic level information
 * for rows that use the "Geographic level" map option. This function fetches division data, builds a breadcrumb
 * for the geographic level, attaches geojson and its properties, and removes the division_id as required.
 *
 * @param spatialFootprint - Array of spatial footprint objects to process
 * @param args - Context object containing at least countryAccountsId
 * @returns The processed spatialFootprint array with enriched geojson and geographic_level fields
 */
async function spatialFootprintPostProcess(
	spatialFootprint: propsSpatialFootprint[],
	args: { countryAccountsId: string }
): Promise<propsSpatialFootprint[]> {
	if (!Array.isArray(spatialFootprint)) return spatialFootprint;

	await Promise.all(
		spatialFootprint.map(async (row) => {
			// Only process rows with map_option 'Geographic level' and a division_id
			if (row.map_option === "Geographic level" && row.division_id) {
				const division = await divisionById(row.division_id, args.countryAccountsId);
				if (division && division.geojson && typeof division.geojson === 'object') {
					// Get all related division IDs
					const divisionAllIds = await getAllIdOnly(row.division_id, args.countryAccountsId);
					const divisionIds: string[] = Array.isArray(divisionAllIds?.rows)
						? divisionAllIds.rows.map((c) => (c as { id: string }).id)
						: [];

					// Build a breadcrumb string for the geographic level
					const parentDivision = await getParent(row.division_id, args.countryAccountsId);
					type DivisionRow = { id: string; name: { en: string } };
					const divisionBreadcrumb = Array.isArray(parentDivision?.rows)
						? (parentDivision.rows as DivisionRow[])
								.slice() // copy so we don't mutate original
								.reverse()
								.map(d => d.name?.en ?? '')
								.filter(Boolean)
								.join(' / ')
						: '';

					// Assign geojson and geographic_level to the row
					row.geojson = division.geojson;
					row.geographic_level = divisionBreadcrumb;

					// Ensure geojson has a properties object with required metadata
					const geojsonAny = row.geojson as any;
					if (!geojsonAny.properties || typeof geojsonAny.properties !== 'object') {
						geojsonAny.properties = {
							name: division.name,
							level: division.level,
							import_id: division.importId,
							division_id: division.id,
							national_id: division.nationalId,
							division_ids: divisionIds,
						};
					}

					// Remove division_id as per business rules
					delete row.division_id;
				}
			}
		})
	);

	return spatialFootprint;
}



/**
 * Validates that for the damages table, both sectorId and assetId are present and that the asset belongs to the sector.
 * Returns an errors object if validation fails, or null if valid.
 *
 * @param item - The item object containing sectorId and assetId
 * @param countryAccountsId - The country account ID for context
 * @returns Promise<Errors<any> | null> - Errors object if invalid, null if valid
 */
async function validateDamageAssetSector(
	ctx: BackendContext,
	item: { sectorId?: string; assetId?: string },
	countryAccountsId: string
): Promise<any | null> {
	if (!("sectorId" in item)) {
		return { sectorId: ["Field 'sectorId' is required."] };
	}
	if (!("assetId" in item)) {
		return { assetId: ["Field 'assetId' is required."] };
	}
	const isInSector = await isAssetInSectorByAssetId(
		ctx,
		item.assetId!,
		item.sectorId!,
		countryAccountsId
	);
	if (!isInSector) {
		return { assetId: ["Asset does not belong to the selected sector."] };
	}
	return null;
}
