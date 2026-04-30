import { Tx } from "~/db.server";

import { eq, and } from "drizzle-orm";

import { insertRow, updateRow } from "~/utils/db";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { humanCategoryPresenceTable } from "~/drizzle/schema/humanCategoryPresenceTable";

import { Def } from "~/frontend/editabletable/base";

import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { capitalizeFirstLetter, lowercaseFirstLetter } from "~/utils/string";

import { tableFromType } from "./tables";

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

export function categoryPresenceTotalJsName(tbl: HumanEffectsTable, d: Def) {
	let dbNamePrefix = categoryPresenceTableDbNamePrefix(tbl);
	let r = "";
	if (!dbNamePrefix) {
		r = d.jsName;
	} else {
		r = lowercaseFirstLetter(tbl) + capitalizeFirstLetter(d.jsName);
	}
	r += "Total";
	return r;
}
export function categoryPresenceTotalDbName(tbl: HumanEffectsTable, d: Def) {
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

