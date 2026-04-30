import { Tx } from "~/db.server";

import { sql, eq, and, isNull, isNotNull } from "drizzle-orm";

import { insertRow, updateRow } from "~/utils/db";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";
import { humanDsgTable } from "~/drizzle/schema/humanDsgTable";

import { Def } from "~/frontend/editabletable/base";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";

import { tableFromType, tableJsName, tableDBName } from "./tables";
import {
	categoryPresenceTotalJsName,
	categoryPresenceTotalDbName,
} from "./category_presence";

export type TotalGroup = string[] | null;

function totalGroupJsName(tbl: HumanEffectsTable) {
	return tableJsName(tbl) + "TotalGroupColumnNames";
}

function totalGroupDBName(tbl: HumanEffectsTable) {
	return tableDBName(tbl) + "_total_group_column_names";
}

export async function totalGroupGet(
	tx: Tx,
	recordId: string,
	tbl: HumanEffectsTable,
): Promise<TotalGroup> {
	// validate that it's not some other string
	tableFromType(tbl);
	let rows = await tx
		.select()
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
	if (!rows.length) {
		return null;
	}
	let row = rows[0];
	let field = totalGroupJsName(tbl);
	let v = (row as unknown as Record<string, string>)[field] ?? null;
	if (v !== null && !Array.isArray(v)) {
		console.error("Expected totalGroup to be an array", v);
		return null;
	}
	return v;
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

	// console.log("found matching rows", r);

	if (!r.length) {
		return;
	}
	if (r.length > 1) {
		// for (let row of r) {
		// 	console.log("row", row);
		// }
		throw new Error("got more than 1 row for delete");
	}
	let deletedId = r[0].id;
	// console.log("deleting", deletedId);
	await tx.delete(t).where(eq(t.dsgId, deletedId)).execute();
	await tx.delete(hd).where(eq(hd.id, deletedId)).execute();
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
		// console.log("updated row", cols, vals);
		await updateRow(tx, humanCategoryPresenceTable, cols, vals, id);
	} else {
		cols.push("record_id");
		vals.push(recordId);
		await insertRow(tx, humanCategoryPresenceTable, cols, vals);
	}
}
export async function getTotalPresenceTable(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
): Promise<Record<string, number>> {
	// validate that it's not some other string
	tableFromType(tblId);

	let rows = await tx
		.select()
		.from(humanCategoryPresenceTable)
		.where(eq(humanCategoryPresenceTable.recordId, recordId));
	let res: Record<string, number> = {};
	let row;
	if (rows.length) {
		row = rows[0];
	}

	for (let d of defs) {
		if (d.role != "metric") {
			continue;
		}
		if (d.custom) {
			throw new Error("Custom metrics not supported");
		}
		let jsNameWithPrefix = categoryPresenceTotalJsName(tblId, d);
		let v;
		if (row) {
			v = (row as unknown as Record<string, number>)[jsNameWithPrefix];
		}
		if (v !== null && v !== undefined) {
			res[d.jsName] = v;
		} else {
			res[d.jsName] = 0;
		}
	}
	return res;
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

	let mDefs = defs.filter((def) => def.role == "metric");

	for (let def of mDefs) {
		let v = data[def.jsName];
		if (typeof v !== "number" || v < 0 || !isFinite(v)) {
			throw new Error(
				`Invalid value for ${def.jsName}: must be a positive number, got ${v}`,
			);
		}
	}

	let dsgId = "";
	{
		let cs = ["record_id", "custom"];
		let vs = [recordId, {}];
		dsgId = await insertRow(tx, humanDsgTable, cs, vs);
	}

	{
		let cs = ["dsg_id", ...mDefs.map((def) => def.dbName)];
		let vs = [dsgId, ...mDefs.map((def) => data[def.jsName])];
		await insertRow(tx, t, cs, vs);
	}
	// console.log("inserting", dsgId);
}

export async function getTotalDsgTable(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
): Promise<Record<string, number>> {
	let t = tableFromType(tblId);
	let h = humanDsgTable;

	let rows = await tx
		.select()
		.from(t)
		.innerJoin(h, eq(t.dsgId, h.id))
		.where(
			and(
				eq(h.recordId, recordId),
				isNull(h.sex),
				isNull(h.age),
				isNull(h.disability),
				isNull(h.globalPovertyLine),
				isNull(h.nationalPovertyLine),
				sql`(
					${h.custom} IS NULL
					OR ${h.custom} = '{}'::jsonb
					OR (
						SELECT COUNT(*)
						FROM jsonb_each(${h.custom})
						WHERE jsonb_typeof(value) != 'null'
					) = 0
				)`,
			),
		)
		.execute();

	if (rows.length > 1) {
		throw new Error("got more than 1 row for get");
	}

	let res: Record<string, number> = {};
	let metricDefs = defs.filter((d) => d.role === "metric");

	for (let def of metricDefs) {
		res[def.jsName] = 0;
	}

	if (rows.length === 0) {
		return res;
	}

	let row = rows[0][tableJsName(tblId)];
	for (let def of metricDefs) {
		let value = row[def.dbName];
		if (typeof value === "number") {
			res[def.jsName] = value;
		}
	}
	return res;
}

export type CalcTotalForGroupRes =
	| { ok: true; totals: Record<string, number> }
	| { ok: false; error?: Error };

export async function calcTotalForGroup(
	tx: Tx,
	tblId: HumanEffectsTable,
	recordId: string,
	defs: Def[],
	group: string[] | null, // columns that are set for this group (["sex"], ["sex", "age"], etc)
): Promise<CalcTotalForGroupRes> {
	if (group === null) {
		return { ok: true, totals: {} };
	}

	let t = tableFromType(tblId);
	let hd = humanDsgTable;

	let dimDefs = defs.filter((d) => d.role == "dimension");
	let metricDefs = defs.filter((d) => d.role == "metric");

	if (metricDefs.length === 0) {
		return { ok: false, error: new Error("No metric fields found") };
	}

	for (let g of group) {
		let dim = dimDefs.find((d) => d.dbName === g);
		if (!dim) {
			return { ok: false, error: new Error(`Unknown dimension: ${g}`) };
		}
		if (dim.format == "date") {
			return {
				ok: false,
				error: new Error(
					`Can't calc group total when one the the cols is date: ${g}`,
				),
			};
		}
	}

	let where = [eq(hd.recordId, recordId)];

	for (let dim of dimDefs) {
		if (!dim.custom) {
			let col: any = null;
			if (dim.shared) {
				col = (hd as any)[dim.jsName];
			} else {
				col = (t as any)[dim.jsName];
			}
			if (group.includes(dim.dbName)) {
				where.push(isNotNull(col));
			} else {
				where.push(isNull(col));
			}
		}
	}

	let rows = await tx
		.select()
		.from(t)
		.innerJoin(hd, eq(t.dsgId, hd.id))
		.where(and(...where))
		.execute();

	let totals: Record<string, number> = {};
	for (let m of metricDefs) {
		totals[m.dbName] = 0;
	}

	for (let row of rows) {
		let data = row[tableJsName(tblId)];
		let hd = row.human_dsg;
		if (!hd) {
			throw "Missing human_dsg";
		}

		let customValid = true;
		if (hd.custom && Object.keys(hd.custom).length > 0) {
			for (let key of Object.keys(hd.custom)) {
				let value = hd.custom[key];
				if (value === null) {
					continue;
				}
				let dim = dimDefs.find((d) => d.dbName === key);
				if (!dim || !dim.custom) {
					customValid = false;
					break;
				}
			}
		}
		if (!customValid) {
			continue;
		}

		let match = true;
		for (let dim of dimDefs) {
			if (!dim.custom) {
				continue;
			}
			let val = hd.custom[dim.dbName];
			if (group.includes(dim.jsName)) {
				if (val == null) match = false;
			} else {
				if (val != null) match = false;
			}
		}
		if (!match) continue;

		for (let m of metricDefs) {
			let value = data[m.dbName];
			if (typeof value == "number" && !isNaN(value) && value >= 0) {
				totals[m.jsName] += value;
			}
		}
	}

	for (let key in totals) {
		if (totals[key] === 0) {
			return { ok: false, error: new Error(`Total for ${key} is zero`) };
		}
	}

	return { ok: true, totals };
}


