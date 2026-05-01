import { Tx } from "~/db.server";

import { sql } from "drizzle-orm";

import {
	insertRow,
	updateRow,
	deleteRow,
	updateRowMergeJson,
} from "~/utils/db";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";

import { Def, DefEnum } from "~/frontend/editabletable/base";
import {
	ValidateRes,
	ETError,
	validateTotalsAreInData,
} from "~/frontend/editabletable/validate";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { toStandardDate } from "~/utils/date";
import { DataWithIdBasic } from "~/frontend/editabletable/base";
import { BackendContext } from "../../context";

import { tableFromType } from "./tables";
import { totalGroupSet } from "./totals";
import { splitDefsByShared } from "./defs";

export type Res = { ok: true; ids: string[] } | { ok: false; error: ETError };

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
				throw new Error(`Unknown def type`);
		}
	}

	return { ok: true, res };
}

export async function create(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	data: any[][],
	dataStrings: boolean,
): Promise<Res> {
	// validate that it's not some other string
	tableFromType(tblId);

	let spl = splitDefsByShared(defs);
	let tbl = tableFromType(tblId);
	let ids: string[] = [];

	for (let [_, row] of data.entries()) {
		let res = validateRow(defs, row, dataStrings, false);
		if (!res.ok) {
			return res;
		}
		let dataSpl = spl.splitRow(res.res);
		let dsgId: string = "";
		let custom = Object.fromEntries(dataSpl.custom);
		{
			let cols = [
				"record_id",
				"custom",
				...spl.defs.shared.map((c) => c.dbName),
			];
			let vals = [recordId, custom, ...dataSpl.shared];
			dsgId = await insertRow(tx, humanDsgTable, cols, vals);
		}

		{
			let cols = ["dsg_id", ...spl.defs.notShared.map((c) => c.dbName)];
			let vals = [dsgId, ...dataSpl.notShared];
			const id = await insertRow(tx, tbl, cols, vals);
			ids.push(id);
		}
	}
	return { ok: true, ids };
}

function convert(cur: { ids: string[]; data: any[][] }): DataWithIdBasic[] {
	if (cur.data.length !== cur.ids.length)
		throw new Error("Length mismatch between data and ids");
	let result = [];
	for (let i = 0; i < cur.data.length; i++) {
		result.push({ id: cur.ids[i], data: cur.data[i] });
	}
	return result;
}

export async function validate(
	ctx: BackendContext,
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	countryAccountsId: string,
	defs: Def[],
): Promise<ValidateRes> {
	// validate that it's not some other string
	tableFromType(tblId);

	let cur = await get(tx, tblId, recordId, countryAccountsId, defs);
	if (!cur.ok) {
		return cur;
	}

	let data = convert(cur);

	return validateTotalsAreInData(ctx, defs, data);
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


