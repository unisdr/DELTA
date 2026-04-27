import { Tx } from "~/db.server";

import { sql, eq, and, isNull, isNotNull } from "drizzle-orm";

import {
	insertRow,
	updateRow,
	deleteRow,
	updateRowMergeJson,
} from "~/utils/db";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { displacedTable } from "~/drizzle/schema/displacedTable";
import { affectedTable } from "~/drizzle/schema/affectedTable";
import { missingTable } from "~/drizzle/schema/missingTable";
import { injuredTable } from "~/drizzle/schema/injuredTable";
import { deathsTable } from "~/drizzle/schema/deathsTable";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";
import { humanDsgConfigTable } from "~/drizzle/schema/humanDsgConfigTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";

import { Def, DefEnum } from "~/frontend/editabletable/base";
import { HumanEffectsCustomDef } from "~/frontend/human_effects/defs";
import { ETError } from "~/frontend/editabletable/validate";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { toStandardDate } from "~/utils/date";
import { capitalizeFirstLetter, lowercaseFirstLetter } from "~/utils/string";

type Res = { ok: true; ids: string[] } | { ok: false; error: ETError };

function tableFromType(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t);
		case "Deaths":
			return deathsTable;
		case "Injured":
			return injuredTable;
		case "Missing":
			return missingTable;
		case "Affected":
			return affectedTable;
		case "Displaced":
			return displacedTable;
	}
}

function tableDBName(t: HumanEffectsTable): any {
	switch (t) {
		default:
			throw new Error("invalid table type: " + t);
		case "Deaths":
		case "Injured":
		case "Missing":
		case "Affected":
		case "Displaced":
			return t.toLowerCase();
	}
}

type SplitRes = {
	defs: { shared: Def[]; custom: Def[]; notShared: Def[] };
	splitRow: (data: any[]) => {
		shared: any[];
		notShared: any[];
		custom: Map<string, any>;
	};
};

function splitDefsByShared(defs: Def[]): SplitRes {
	let custom: Def[] = [];
	let shared: Def[] = [];
	let notShared: Def[] = [];

	for (let i = 0; i < defs.length; i++) {
		if (defs[i].custom) {
			custom.push(defs[i]);
		} else if (defs[i].shared) {
			shared.push(defs[i]);
		} else {
			notShared.push(defs[i]);
		}
	}

	const splitRow = (data: any[]) => {
		let custom = new Map<string, any>();
		let shared: any[] = [];
		let notShared: any[] = [];
		for (let i = 0; i < defs.length; i++) {
			let d = defs[i];
			if (d.custom) {
				custom.set(d.dbName, data[i]);
			} else if (d.shared) {
				shared.push(data[i]);
			} else {
				notShared.push(data[i]);
			}
		}
		return {
			custom,
			shared,
			notShared,
		};
	};

	return { defs: { shared, custom, notShared }, splitRow };
}

type ValidateRowRes = { ok: true; res: any[] } | { ok: false; error: ETError };

function validateRow(
	defs: Def[],
	row: any[],
	dataStrings: boolean,
	allowPartial: boolean,
): ValidateRowRes {
	let res: any[] = [];

	let invalidValueErr = function (msg: string): ValidateRowRes {
		return { ok: false, error: new ETError("invalid_value", msg) };
	};

	for (let i = 0; i < defs.length; i++) {
		let def = defs[i];
		let value = row[i];
		if (value === undefined) {
			if (allowPartial) {
				res.push(undefined);
				continue;
			} else {
				return {
					ok: false,
					error: new ETError("invalid_value", "Undefined value in row"),
				};
			}
		}
		if (dataStrings) {
			if (value === "") {
				res.push(null);
				continue;
			}
		}
		if (value === null) {
			res.push(null);
			continue;
		}

		switch (def.format) {
			case "enum": {
				let enumDef = def as DefEnum;
				if (!enumDef.data.some((entry) => entry.key === value)) {
					return invalidValueErr(
						`Invalid enum value "${value}" for field "${def.jsName}"`,
					);
				}
				res.push(value);
				break;
			}
			case "number": {
				let numValue: number;
				if (!dataStrings) {
					if (typeof value !== "number") {
						return invalidValueErr(
							`Invalid number value "${value}" for field "${def.jsName}"`,
						);
					}
					numValue = value;
				} else {
					numValue = Number(value);
					if (isNaN(numValue)) {
						return invalidValueErr(
							`Invalid number string "${value}" for field "${def.jsName}"`,
						);
					}
				}
				if (numValue > 1000000000) {
					return invalidValueErr(
						`Value "${numValue}" for field "${def.jsName}" exceeds maximum allowed value of 1,000,000,000`,
					);
				}
				res.push(numValue);
				break;
			}
			case "date":
				if (typeof value !== "string") {
					return invalidValueErr(
						`Invalid date type, not a string "${value}" for field "${def.jsName}"`,
					);
				}
				let d = toStandardDate(value);
				if (!d) {
					return invalidValueErr(
						`Invalid date format "${value}" for field "${def.jsName}"`,
					);
				}
				res.push(d);
				break;
			default:
				throw `Unknown def type`;
		}
	}

	return { ok: true, res };
}

export async function update(
	tx: Tx,
	tblId: HumanEffectsTable,
	defs: Def[],
	ids: string[],
	data: any[][],
	dataStrings: boolean,
): Promise<Res> {
	let spl = splitDefsByShared(defs);
	let tbl = tableFromType(tblId);

	if (ids.length !== data.length) {
		return {
			ok: false,
			error: new ETError("other", "Mismatch between ids and data rows"),
		};
	}

	for (let i = 0; i < data.length; i++) {
		let row = data[i];
		let id = ids[i];

		let res = validateRow(defs, row, dataStrings, true);
		if (!res.ok) {
			return res;
		}

		let dataSpl = spl.splitRow(res.res);
		let custom: any | null = null;
		if (dataSpl.custom.size) {
			custom = Object.fromEntries(dataSpl.custom);
		}

		let dsgIdRes = await tx.execute(
			sql`SELECT dsg_id FROM ${tbl} WHERE id = ${id}`,
		);
		if (!dsgIdRes.rows.length) {
			return {
				ok: false,
				error: new ETError("other", `Update: record not found for id: ${id}`),
			};
		}
		let dsgId = dsgIdRes.rows[0].dsg_id;
		if (!dsgId) {
			return {
				ok: false,
				error: new ETError("other", `Update: dsg_id missing`),
			};
		}
		{
			let cols = spl.defs.shared.map((c) => c.dbName);
			let vals = dataSpl.shared;
			let jsonbParams = new Set<number>();
			if (custom) {
				jsonbParams.add(vals.length);
				cols.push("custom");
				vals.push(custom);
			}
			await updateRowMergeJson(
				tx,
				humanDsgTable,
				cols,
				vals,
				dsgId,
				jsonbParams,
			);
		}
		{
			let cols = spl.defs.notShared.map((c) => c.dbName);
			let vals = dataSpl.notShared;
			await updateRow(tx, tbl, cols, vals, id);
		}
	}

	return { ok: true, ids };
}

export async function deleteRows(
	tx: Tx,
	tblId: HumanEffectsTable,
	ids: string[],
): Promise<Res> {
	let tbl = tableFromType(tblId);
	let deletedIds: string[] = [];

	for (let id of ids) {
		let dsgIdRes = await tx.execute(
			sql`SELECT dsg_id FROM ${tbl} WHERE id = ${id}`,
		);
		let dsgId = dsgIdRes.rows[0]?.dsg_id;

		if (!dsgId) {
			return {
				ok: false,
				error: new ETError("other", `Record not found for id: ${id}`),
			};
		}

		await deleteRow(tx, tbl, id);
		await deleteRow(tx, humanDsgTable, dsgId);
		deletedIds.push(id);
	}

	return { ok: true, ids: deletedIds };
}

export async function clearData(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
): Promise<Res> {
	let tbl = tableFromType(tblId);
	await totalGroupSet(tx, recordId, tblId, null);

	let res = await tx.execute(sql`
SELECT data.id FROM ${tbl} data
INNER JOIN human_dsg ON human_dsg.id = data.dsg_id
WHERE human_dsg.record_id = ${recordId}
`);
	let ids: string[] = [];
	for (let row of res.rows) {
		ids.push(row.id as string);
	}
	return deleteRows(tx, tblId, ids);
}

export type GetRes =
	| { ok: true; defs: Def[]; ids: string[]; data: any[][] }
	| { ok: false; error: ETError };

export async function get(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	countryAccountsId: string,
	defs: Def[],
): Promise<GetRes> {
	let spl = splitDefsByShared(defs);

	let tbl = tableFromType(tblId);

	let cols = [
		...spl.defs.shared.map((d) => (humanDsgTable as any)[d.jsName]),
		...spl.defs.notShared.map((d) => tbl[d.jsName]),
	];

	let query = sql`
		SELECT ${tbl.id}, ${humanDsgTable.custom}, ${sql.join(cols, sql`, `)}
		FROM ${humanDsgTable}
		INNER JOIN ${tbl} ON ${humanDsgTable.id} = ${tbl.dsgId}
		INNER JOIN ${disasterRecordsTable} ON ${disasterRecordsTable.id} = ${humanDsgTable.recordId}
		WHERE ${humanDsgTable.recordId} = ${recordId}
		AND ${disasterRecordsTable.countryAccountsId} = ${countryAccountsId}
	`;

	let res = await tx.execute(query);
	let combined = res.rows.map((row: any) => ({
		id: row.id as string,
		data: defs.map((d) => {
			if (d.custom) {
				if (!row.custom) return null;
				return row.custom[d.dbName] || null;
			}
			return row[d.dbName];
		}),
	}));

	// console.log("combined data", combined)

	combined.sort((a, b) => {
		for (let i = 0; i < a.data.length; i++) {
			if (a.data[i] === null && b.data[i] !== null) return -1;
			if (a.data[i] !== null && b.data[i] === null) return 1;
			if (a.data[i] < b.data[i]) return -1;
			if (a.data[i] > b.data[i]) return 1;
		}
		return 0;
	});

	let ids = combined.map((item) => item.id);
	let data = combined.map((item) => item.data);

	return { ok: true, defs, ids, data };
}

async function getHidden(tx: Tx) {
	let row = await tx.query.humanDsgConfigTable.findFirst();
	return new Set(row?.hidden?.cols || []);
}

// Maps database column names to JavaScript property names for built-in disaggregation columns.
// Used to check which columns have data, to prevent hiding columns that contain data.
export const builtinDsgColumns = [
	{ dbName: "sex", jsName: "sex" },
	{ dbName: "age", jsName: "age" },
	{ dbName: "disability", jsName: "disability" },
	{ dbName: "global_poverty_line", jsName: "globalPovertyLine" },
	{ dbName: "national_poverty_line", jsName: "nationalPovertyLine" },
] as const;

export function sharedDefsAll(): Def[] {
	let shared: Def[] = [
		{
			uiName: "Sex",
			jsName: "sex",
			dbName: "sex",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "m",
					label: "M-Male",
				},
				{
					key: "f",
					label: "F-Female",
				},
				{
					key: "o",
					label: "O-Other Non-binary",
				},
			],
		},
		{
			uiName: "Age",
			jsName: "age",
			dbName: "age",
			uiColWidth: "medium", // 90
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "0-14",
					label: "Children, (0-14)",
				},
				{
					key: "15-64",
					label: "Adult, (15-64)",
				},
				{
					key: "65+",
					label: "Elder (65-)",
				},
			],
		},
		{
			uiName: "Disability",
			jsName: "disability",
			dbName: "disability",
			uiColWidth: "wide", // 120
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "none",
					label: "No disabilities",
				},
				{
					key: "physical_dwarfism",
					label: "Physical, dwarfism",
				},
				{
					key: "physical_problems_in_body_functioning",
					label: "Physical, Problems in body functioning",
				},
				{
					key: "physical_problems_in_body_structures",
					label: "Physical, Problems in body structures",
				},
				{
					key: "physical_other_physical_disability",
					label: "Physical, Other physical disability",
				},
				{
					key: "sensorial_visual_impairments_blindness",
					label: "Sensorial, visual impairments, blindness",
				},
				{
					key: "sensorial_visual_impairments_partial_sight_loss",
					label: "Sensorial, visual impairments, partial sight loss",
				},
				{
					key: "sensorial_visual_impairments_colour_blindness",
					label: "Sensorial, visual impairments, colour blindness",
				},
				{
					key: "sensorial_hearing_impairments_deafness_hard_of_hearing",
					label: "Sensorial, Hearing impairments, Deafness, hard of hearing",
				},
				{
					key: "sensorial_hearing_impairments_deafness_other_hearing_disability",
					label:
						"Sensorial, Hearing impairments, Deafness, other hearing disability",
				},
				{
					key: "sensorial_other_sensory_impairments",
					label: "Sensorial, other sensory impairments",
				},
				{
					key: "psychosocial",
					label: "Psychosocial",
				},
				{
					key: "intellectual_cognitive",
					label: "Intellectual/ Cognitive",
				},
				{
					key: "multiple_deaf_blindness",
					label: "Multiple, Deaf blindness",
				},
				{
					key: "multiple_other_multiple",
					label: "Multiple, other multiple",
				},
				{
					key: "others",
					label: "Others",
				},
			],
		},
		{
			uiName: "Global poverty line",
			jsName: "globalPovertyLine",
			dbName: "global_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "below",
					label: "Below",
				},
				{
					key: "above",
					label: "Above",
				},
			],
		},
		{
			uiName: "National poverty line",
			jsName: "nationalPovertyLine",
			dbName: "national_poverty_line",
			uiColWidth: "thin", // 60
			format: "enum",
			role: "dimension",
			data: [
				{
					key: "below",
					label: "Below",
				},
				{
					key: "above",
					label: "Above",
				},
			],
		},
	];
	for (const item of shared) {
		item.shared = true;
	}
	return shared;
}

export async function sharedDefs(tx: Tx): Promise<Def[]> {
	let hidden = await getHidden(tx);
	let shared = sharedDefsAll();
	shared = shared.filter((d) => !hidden.has(d.dbName));
	return shared;
}

async function defsCustom(tx: Tx, countryAccountsId: string): Promise<Def[]> {
	const row = await tx.query.humanDsgConfigTable.findFirst({
		where: eq(humanDsgConfigTable.countryAccountsId, countryAccountsId),
	});
	if (!row?.custom?.config) {
		return [];
	}
	return row.custom.config.map((d) => {
		return {
			uiName: d.uiName,
			jsName: d.dbName,
			dbName: d.dbName,
			uiColWidth: d.uiColWidth,
			format: "enum",
			role: "dimension",
			custom: true,
			data: d.enum,
		};
	});
}

export async function defsForTable(
	tx: Tx,
	tbl: HumanEffectsTable,
	countryAccountsId: string,
): Promise<Def[]> {
	return [
		...(await sharedDefs(tx)),
		...(await defsCustom(tx, countryAccountsId)),
		...defsForTableGlobal(tbl),
	];
}

export function defsForTableGlobal(tbl: HumanEffectsTable): Def[] {
	let res: Def[] = [];
	switch (tbl) {
		case "Deaths":
			res.push({
				uiName: "Deaths",
				jsName: "deaths",
				dbName: "deaths",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Injured":
			res.push({
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Missing":
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin",
			});
			res.push({
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Affected":
			res.push({
				uiName: "Directly affected (Old DesInventar)",
				jsName: "direct",
				dbName: "direct",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			res.push({
				uiName: "Indirectly affected (Old DesInventar)",
				jsName: "indirect",
				dbName: "indirect",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		case "Displaced":
			res.push({
				uiName: "Assisted",
				jsName: "assisted",
				dbName: "assisted",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "assisted",
						label: "Assisted",
					},
					{
						key: "not_assisted",
						label: "Not Assisted",
					},
				],
				uiColWidth: "medium",
			});
			res.push({
				uiName: "Timing",
				jsName: "timing",
				dbName: "timing",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "pre-emptive",
						label: "Pre-emptive",
					},
					{
						key: "reactive",
						label: "Reactive",
					},
				],
				uiColWidth: "medium",
			});
			res.push({
				uiName: "Duration",
				jsName: "duration",
				dbName: "duration",
				format: "enum",
				role: "dimension",
				data: [
					{
						key: "short",
						label: "Short Term",
					},
					{
						key: "medium_short",
						label: "Medium Short Term",
					},
					{
						key: "medium_long",
						label: "Medium Long Term",
					},
					{
						key: "long",
						label: "Long Term",
					},
					{
						key: "permanent",
						label: "Permanent",
					},
				],
				uiColWidth: "wide",
			});
			res.push({
				uiName: "As of",
				jsName: "asOf",
				dbName: "as_of",
				format: "date",
				role: "dimension",
				uiColWidth: "thin",
			});
			res.push({
				uiName: "Displaced",
				jsName: "displaced",
				dbName: "displaced",
				format: "number",
				role: "metric",
				uiColWidth: "thin",
			});
			break;
		default:
			throw new Error(`Unknown table: ${tbl}`);
	}
	return res;
}

function categoryPresenceTableDbNamePrefix(tbl: HumanEffectsTable) {
	switch (tbl) {
		case "Deaths":
			return "";
		case "Injured":
			return "";
		case "Missing":
			return "";
		case "Affected":
			return "affected";
		case "Displaced":
			return "";
	}
}

function categoryPresenceJsName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl);
	if (!dbNamePrefix) {
		return d.jsName;
	}
	return lowercaseFirstLetter(tbl) + capitalizeFirstLetter(d.jsName);
}
function categoryPresenceDbName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl);
	if (!dbNamePrefix) {
		return d.dbName;
	}
	return dbNamePrefix + "_" + d.dbName;
}

function categoryPresenceTotalDbName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl);
	let r = "";
	if (!dbNamePrefix) {
		r = d.dbName;
	} else {
		r = dbNamePrefix + "_" + d.dbName;
	}
	r += "_total";
	return r;
}

export async function categoryPresenceGet(
	tx: Tx,
	recordId: string,
	countryAccountsId: string,
	tblId: HumanEffectsTable,
	defs: Def[],
): Promise<Record<string, boolean | null>> {
	// validate that it's not some other string
	tableFromType(tblId);

	let rows = await tx
		.select()
		.from(humanCategoryPresenceTable)
		.innerJoin(
			disasterRecordsTable,
			eq(disasterRecordsTable.id, humanCategoryPresenceTable.recordId),
		)
		.where(
			and(
				eq(humanCategoryPresenceTable.recordId, recordId),
				eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
			),
		);

	let res: Record<string, boolean | null> = {};
	let row;
	if (rows.length) {
		row = rows[0].human_category_presence;
	}

	for (let d of defs) {
		if (d.role != "metric") {
			continue;
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported");
		}
		let jsNameWithPrefix = categoryPresenceJsName(tblId, d);
		let v;
		if (row) {
			v = (row as unknown as Record<string, boolean | null>)[jsNameWithPrefix];
		}
		if (v !== null && v !== undefined) {
			res[d.jsName] = v;
		} else {
			res[d.jsName] = null;
		}
	}
	return res;
}

export async function categoryPresenceSet(
	tx: Tx,
	recordId: string,
	tblId: HumanEffectsTable,
	defs: Def[],
	data: Record<string, boolean>,
) {
	// validate that it's not some other string
	tableFromType(tblId);

	let validKeys = new Set(
		defs.filter((d) => d.role === "metric" && !d.custom).map((d) => d.jsName),
	);
	let invalidKeys = Object.keys(data).filter((k) => !validKeys.has(k));
	if (invalidKeys.length > 0) {
		throw new Error(
			`Invalid keys: ${invalidKeys.join(", ")}. Valid keys are: ${Array.from(validKeys).join(", ")}`,
		);
	}

	let rowData: Record<string, boolean | null> = {};
	for (let d of defs) {
		if (d.role != "metric") {
			continue;
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported");
		}
		let v = data[d.jsName] ?? null;
		let name = categoryPresenceDbName(tblId, d);
		rowData[name] = v;
	}
	let cols: string[] = [];
	let vals: any[] = [];
	for (let [k, v] of Object.entries(rowData)) {
		cols.push(k);
		vals.push(v);
	}
	let rows = await tx
		.select({
			id: humanCategoryPresenceTable.id,
		})
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
	if (rows.length) {
		let id = rows[0].id;
		await updateRow(tx, humanCategoryPresenceTable, cols, vals, id);
	} else {
		cols.push("record_id");
		vals.push(recordId);
		await insertRow(tx, humanCategoryPresenceTable, cols, vals);
	}
}

export async function categoryPresenceDeleteAll(tx: Tx, recordId: string) {
	await tx
		.delete(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
}

export type TotalGroup = string[] | null;

function totalGroupDBName(tbl: HumanEffectsTable) {
	return tableDBName(tbl) + "_total_group_column_names";
}

export async function totalGroupSet(
	tx: Tx,
	recordId: string,
	tbl: HumanEffectsTable,
	groupKey: TotalGroup,
) {
	// validate that it's not some other string
	tableFromType(tbl);
	let field = totalGroupDBName(tbl);
	let val = JSON.stringify(groupKey);
	let rows = await tx
		.select({
			id: humanCategoryPresenceTable.id,
		})
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
	if (rows.length) {
		let id = rows[0].id;
		await updateRow(tx, humanCategoryPresenceTable, [field], [val], id);
	} else {
		let cols = ["record_id", field];
		let vals = [recordId, val];
		await insertRow(tx, humanCategoryPresenceTable, cols, vals);
	}
}

async function deleteTotal(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
) {
	let t = tableFromType(tblId);

	let dimDefs = defs.filter((d) => d.role == "dimension");

	let hd = humanDsgTable;

	let where = [
		eq(hd.recordId, recordId),
		isNull(hd.sex),
		isNull(hd.age),
		isNull(hd.disability),
		isNull(hd.globalPovertyLine),
		isNull(hd.nationalPovertyLine),
		sql`(
					${hd.custom} IS NULL
					OR ${hd.custom} = '{}'::jsonb
					OR (
						SELECT COUNT(*)
						FROM jsonb_each(${hd.custom})
						WHERE jsonb_typeof(value) != 'null'
					) = 0
				)`,
	];

	for (let dim of dimDefs) {
		if (!dim.custom && !dim.shared) {
			let col = (t as any)[dim.jsName];
			where.push(isNull(col));
		}
	}

	let r = await tx
		.select({
			id: hd.id,
		})
		//.select()
		.from(hd)
		.innerJoin(t, eq(hd.id, t.dsgId))
		.where(and(...where))
		.execute();

	console.log("found matching rows", r);

	if (!r.length) {
		return;
	}
	if (r.length > 1) {
		for (let row of r) {
			console.log("row", row);
		}
		throw new Error("got more than 1 row for delete");
	}
	let d = r[0].id;
	console.log("deleting", d);
	await tx.delete(t).where(eq(t.dsgId, d)).execute();
	await tx.delete(hd).where(eq(hd.id, d)).execute();
}

export async function setTotal(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any,
) {
	//console.log("setting totals", "data", data)
	await setTotalPresenceTable(tx, tblId, recordId, defs, data);
	await setTotalDsgTable(tx, tblId, recordId, defs, data);
}

export async function setTotalPresenceTable(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any,
) {
	// validate that it's not some other string
	tableFromType(tblId);

	let rowData: Record<string, boolean | null> = {};
	for (let d of defs) {
		if (d.role != "metric") {
			continue;
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported");
		}
		let v = data[d.jsName] ?? null;
		let name = categoryPresenceTotalDbName(tblId, d);
		rowData[name] = v;
	}
	let cols: string[] = [];
	let vals: any[] = [];
	for (let [k, v] of Object.entries(rowData)) {
		cols.push(k);
		vals.push(v);
	}
	let rows = await tx
		.select({
			id: humanCategoryPresenceTable.id,
		})
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
	if (rows.length) {
		let id = rows[0].id;
		console.log("updated row", cols, vals);
		await updateRow(tx, humanCategoryPresenceTable, cols, vals, id);
	} else {
		cols.push("record_id");
		vals.push(recordId);
		await insertRow(tx, humanCategoryPresenceTable, cols, vals);
	}
}

export async function setTotalDsgTable(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any,
) {
	let t = tableFromType(tblId);

	await deleteTotal(tx, tblId, recordId, defs);

	if (data.length == 0) {
		return;
	}

	let mDefs = defs.filter((d) => d.role == "metric");

	for (let d of mDefs) {
		let v = data[d.jsName];
		if (typeof v !== "number" || v < 0 || !isFinite(v)) {
			throw new Error(
				`Invalid value for ${d.jsName}: must be a positive number, got ${v}`,
			);
		}
	}

	let d = "";
	{
		let cs = ["record_id", "custom"];
		let vs = [recordId, {}];
		d = await insertRow(tx, humanDsgTable, cs, vs);
	}

	{
		let cs = ["dsg_id", ...mDefs.map((d) => d.dbName)];
		let vs = [d, ...mDefs.map((d) => data[d.jsName])];
		await insertRow(tx, t, cs, vs);
	}
	console.log("inserting", d);
}

export type CalcTotalForGroupRes =
	| { ok: true; totals: Record<string, number> }
	| { ok: false; error?: Error };

// Returns the set of built-in disaggregation column names that contain data for a given country account.
// This prevents users from hiding columns that have existing data, which would corrupt the data integrity.
// Scans human_dsg table for non-null values in each built-in column, filtered by country_accounts_id.
export async function getUsedBuiltinColumns(
	tx: Tx,
	countryAccountsId: string,
): Promise<Set<string>> {
	const usedColumns = new Set<string>();

	for (const col of builtinDsgColumns) {
		const rows = await tx
			.select({ id: humanDsgTable.id })
			.from(humanDsgTable)
			.innerJoin(
				disasterRecordsTable,
				eq(humanDsgTable.recordId, disasterRecordsTable.id),
			)
			.where(
				and(
					isNotNull((humanDsgTable as any)[col.jsName]),
					eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
				),
			)
			.limit(1);
		if (rows.length > 0) {
			usedColumns.add(col.dbName);
		}
	}

	return usedColumns;
}

export interface UsedCustomColumnsAndValues {
	columns: string[];
	valuesByColumn: Record<string, string[]>;
}

// Returns which custom disaggregation columns and specific enum values are in use.
// This prevents users from deleting columns or enum values that have existing data.
// Custom columns are stored as JSONB in human_dsg.custom, where keys are column names
// and values are the selected enum values.
// Uses PostgreSQL JSON functions for efficiency: jsonb_object_keys extracts column names,
// jsonb_each_text expands key-value pairs, aggregated with array_agg(DISTINCT).
// Filters out null values - a column with only null values is not considered "in use".
export async function getUsedCustomColumnsAndValues(
	tx: Tx,
	countryAccountsId: string,
): Promise<UsedCustomColumnsAndValues> {
	const valuesRes = await tx.execute(sql`
		SELECT kv.key as column_name, array_agg(DISTINCT kv.value) FILTER (WHERE kv.value IS NOT NULL) as values
		FROM human_dsg
		CROSS JOIN LATERAL jsonb_each_text(human_dsg.custom) as kv
		INNER JOIN disaster_records ON disaster_records.id = human_dsg.record_id
		WHERE human_dsg.custom IS NOT NULL
		AND human_dsg.custom != '{}'::jsonb
		AND disaster_records.country_accounts_id = ${countryAccountsId}
		GROUP BY kv.key
		HAVING COUNT(*) FILTER (WHERE kv.value IS NOT NULL) > 0
	`);

	const columns: string[] = [];
	const valuesByColumn: Record<string, string[]> = {};

	for (const row of valuesRes.rows) {
		columns.push(row.column_name as string);
		valuesByColumn[row.column_name as string] = row.values as string[];
	}

	return { columns, valuesByColumn };
}

export interface ValidateCustomConfigError {
	code: string;
	column?: string;
	value?: string;
}

// Validates changes to custom disaggregation column configuration.
// Returns an error if attempting to delete a column or enum value that has existing data.
// This protects data integrity by preventing configuration changes that would orphan data references.
// Allows adding new columns/values and modifying UI labels, but blocks deletion of in-use items.
export async function validateCustomConfigChanges(
	tx: Tx,
	countryAccountsId: string,
	currentConfig: HumanEffectsCustomDef[] | null,
	newConfig: HumanEffectsCustomDef[] | null,
): Promise<ValidateCustomConfigError | null> {
	const currentDefs = currentConfig || [];
	const newDefs = newConfig || [];

	const { columns: usedColumns, valuesByColumn } =
		await getUsedCustomColumnsAndValues(tx, countryAccountsId);

	const currentDbNames = new Set(currentDefs.map((d) => d.dbName));
	const newDbNames = new Set(newDefs.map((d) => d.dbName));

	for (const dbName of currentDbNames) {
		if (!newDbNames.has(dbName) && usedColumns.includes(dbName)) {
			return {
				code: "cannot_delete_column_with_data",
				column: dbName,
			};
		}
	}

	const currentDefMap = new Map<string, HumanEffectsCustomDef>();
	for (const def of currentDefs) {
		currentDefMap.set(def.dbName, def);
	}

	for (const newDef of newDefs) {
		const currentDef = currentDefMap.get(newDef.dbName);
		if (currentDef) {
			const usedValues = valuesByColumn[newDef.dbName] || [];
			const currentKeys = new Set(currentDef.enum.map((e) => e.key));
			const newKeys = new Set(newDef.enum.map((e) => e.key));

			for (const oldKey of currentKeys) {
				if (!newKeys.has(oldKey) && usedValues.includes(oldKey)) {
					return {
						code: "cannot_remove_value_with_data",
						column: newDef.dbName,
						value: oldKey,
					};
				}
			}
		}
	}

	return null;
}
