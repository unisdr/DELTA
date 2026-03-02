import { DefData, GroupKey } from "~/frontend/editabletable/base";
import { DContext } from "~/utils/dcontext";

export interface DataWithIdBasic {
	id: string;
	data: any[];
}

export class ETError {
	code: string;
	message: string;
	constructor(code: string, message: string) {
		this.code = code;
		this.message = message;
	}
	toJSON() {
		return {
			code: this.code,
			message: this.message,
		};
	}
}

export class RowError {
	code: string;
	message: string;
	rowId: string;
	constructor(rowId: string, code: string, message: string) {
		this.rowId = rowId;
		this.code = code;
		this.message = message;
	}
	toJSON() {
		return {
			code: this.code,
			message: this.message,
			rowId: this.rowId,
		};
	}
}

export class GroupError {
	code: string;
	message: string;
	groupKey: string;
	constructor(groupKey: string, code: string, message: string) {
		this.groupKey = groupKey;
		this.code = code;
		this.message = message;
	}
	toJSON() {
		return {
			code: this.code,
			message: this.message,
			groupKey: this.groupKey,
		};
	}
}

export type ValidateRes =
	| {
			ok: true;
			rowWarnings?: RowError[];
			groupWarnings?: GroupError[];
	  }
	| {
			ok: false;
			tableError?: ETError;
			rowErrors?: RowError[];
			groupErrors?: GroupError[];
			rowWarnings?: RowError[];
			groupWarnings?: GroupError[];
	  };

export function validateResToMessage(res: ValidateRes): string {
	if (res.ok) return "";
	if (res.tableError) return res.tableError.message;
	if (res.rowErrors && res.rowErrors.length > 0)
		return res.rowErrors[0].message;
	if (res.groupErrors && res.groupErrors.length > 0)
		return res.groupErrors[0].message;
	return "Validation failed, but no error message provided by code (this is a bug).";
}

export function getTotalsFromData(defs: DefData[], data: DataWithIdBasic[]) {
	let i = 0;
	while (i < defs.length && defs[i].role === "dimension") {
		i = i + 1;
	}
	if (i >= defs.length) {
		return { totals: null, dataNoTotals: [...data] };
	}

	let totals: number[] | null = null;
	let totalsAdded = false;
	let dataNoTotals: DataWithIdBasic[] = [];

	for (const r of data) {
		let isTotals = true;
		let j = 0;
		while (j < i) {
			if (r.data[j] !== null) {
				isTotals = false;
				break;
			}
			j = j + 1;
		}
		if (isTotals && !totalsAdded) {
			totals = [];
			let k = i;
			while (k < defs.length) {
				const v = r.data[k];
				totals.push(v);
				k++;
			}
			totalsAdded = true;
		} else {
			dataNoTotals.push(r);
		}
	}

	return { totals: totals, dataNoTotals: dataNoTotals };
}

export function validateTotalsAreInData(
	ctx: DContext,
	defs: DefData[],
	data: DataWithIdBasic[],
): ValidateRes {
	console.log("validateTotalsAreInData", data);
	let { dataNoTotals, totals } = getTotalsFromData(defs, data);
	return validate(ctx, defs, dataNoTotals, totals);
}

export function validate(
	ctx: DContext,
	defs: DefData[],
	data: DataWithIdBasic[],
	totalsArr: number[] | null,
): ValidateRes {
	let errors = new Map<string, RowError>();

	// validate that we don't have rows without dims (that data must be passed in totalsArr instead)
	for (let row of data) {
		let gk = rowToGroupKey(defs, row.data);
		if (groupKeyOnlyZeroes(gk)) {
			let e = new RowError(
				row.id,
				"no_dimension_data",
				ctx.t({
					code: "human_effects.error.no_dimension_data",
					desc: "Error shown when a row has no dimension data but is not a totals row.",
					msg: "Row exists with no dimension data (and it's not a totals row)",
				}),
			);
			errors.set(row.id, e);
		}
	}

	// validate that we don't have rows with duplicate dimensions
	let checked = new Map<string, DataWithIdBasic>();
	let dupErr = function (rowId: string) {
		let e = new RowError(
			rowId,
			"duplicate_dimension",
			ctx.t({
				code: "human_effects.error.duplicate_dimension",
				msg: "Two or more rows have the same disaggregation values.",
			}),
		);
		errors.set(rowId, e);
	};
	for (let [_, row1] of data.entries()) {
		let gk = rowToGroupKey(defs, row1.data);
		if (groupKeyOnlyZeroes(gk)) {
			continue;
		}
		let id1 = row1.id;
		for (let [id2, row2] of checked.entries()) {
			let gk = rowToGroupKey(defs, row2.data);
			if (groupKeyOnlyZeroes(gk)) {
				continue;
			}
			if (sameDimentions(defs, row1.data, row2.data)) {
				dupErr(id1);
				dupErr(id2);
			}
		}
		checked.set(id1, row1);
	}
	if (errors.size) {
		let e2 = Array.from(errors.values());
		e2.sort((a, b) => a.rowId.localeCompare(b.rowId));
		return { ok: false, rowErrors: e2 };
	}

	// check that no group total is larger than totals
	let metricCount = 0;
	for (let def of defs) {
		if (def.role == "metric") {
			metricCount++;
		}
	}

	let totals = new Map<string, number>();
	if (totalsArr !== null) {
		if (totalsArr.length == 0) {
			let e = new ETError(
				"totals_array_empty",
				ctx.t({
					code: "human_effects.error.totals_array_empty",
					msg: "Totals array is empty",
				}),
			);
			return { ok: false, tableError: e };
		}
		if (metricCount != totalsArr.length) {
			let e = new ETError(
				"invalid_data",
				ctx.t(
					{
						code: "human_effects.error.totals_cols_mismatch",
						desc: "Number of columns in totals does not match expected number of metrics. {expected} is the expected count, {actual} is the actual length.",
						msg: "Number of cols in totals does not match expected number of metrics, wanted {expected} got {actual}",
					},
					{ expected: metricCount, actual: totalsArr.length },
				),
			);
			return { ok: false, tableError: e };
		}
		let i = 0;
		for (let def of defs) {
			if (def.role == "metric") {
				totals.set(def.dbName, totalsArr[i]);
				i++;
			}
		}
	}

	let rowErrors: RowError[] = [];
	let groupErrors: GroupError[] = [];
	let rowWarnings: RowError[] = [];
	let groupWarnings: GroupError[] = [];

	let gTotals = groupTotals(defs, data);

	if (totals) {
		for (const [gk, metrics] of gTotals) {
			if (groupKeyOnlyZeroes(gk)) continue;
			let gkDefs = groupKeyToDefs(defs, gk);
			let hasDate = false;
			for (let def of gkDefs) {
				if (def.format == "date") {
					hasDate = true;
					break;
				}
			}
			if (hasDate) {
				// do not validate totals for rows that have dates in them
				continue;
			}

			let gkNames = groupKeyToColNames(defs, gk);
			for (const [metric, value] of metrics) {
				let totalValue = totals.get(metric) || 0;
				if (value > totalValue) {
					let e = new GroupError(
						gk,
						"subtotal_larger_than_total",
						ctx.t(
							{
								code: "human_effects.error.subtotal_larger_than_total",
								desc: "The subtotal for a group exceeds the overall total. {group} is the group name(s), {column} is the metric name, {value} is the group total, {totalValue} is the overall total.",
								msg: 'Total for group ({group}), column "{column}" exceeds overall total {value} > {totalValue}',
							},
							{
								group: gkNames.join(","),
								column: metric,
								value,
								totalValue,
							},
						),
					);
					groupErrors.push(e);

					// Add row error for every row in this group
					for (const row of data) {
						let rowGroupKey = rowToGroupKey(defs, row.data);
						if (rowGroupKey === gk) {
							let rowErr = new RowError(
								row.id,
								"subtotal_larger_than_total",
								ctx.t(
									{
										code: "human_effects.error.subtotal_larger_than_total_row",
										desc: "The row belongs to a group where the subtotal exceeds the overall total. {group} is the group name(s), {metric} is the column, {value} is the group total, {totalValue} is the overall total.",
										msg: "Row belongs to group, for which total [{group}] {metric}={value} exceeds overall total ({totalValue})",
									},
									{
										group: gkNames.join(","),
										metric,
										value,
										totalValue,
									},
								),
							);
							rowErrors.push(rowErr);
						}
					}
				} else if (value < totalValue) {
					let e = new GroupError(
						gk,
						"subtotal_lower_than_total",
						ctx.t({
							code: "human_effects.error.subtotal_lower_than_total",
							desc: "Warning when the subtotal for a group is lower than the overall total. User should confirm if this is intentional.",
							msg: "Subtotal is lower than the total, please check if this is intentional.",
						}),
					);
					groupWarnings.push(e);

					// Add row error for every row in this group
					for (const row of data) {
						let rowGroupKey = rowToGroupKey(defs, row.data);
						if (rowGroupKey === gk) {
							let rowErr = new RowError(
								row.id,
								"subtotal_lower_than_total",
								ctx.t({
									code: "human_effects.error.subtotal_lower_than_total",
									desc: "Warning when the subtotal for a row's group is lower than the overall total. User should confirm if this is intentional.",
									msg: "Subtotal is lower than the total, please check if this is intentional.",
								}),
							);
							rowWarnings.push(rowErr);
						}
					}
				}
			}
		}
	}

	// check that all rows have at least one metric filled in
	// check that all rows have at least one metric that is not zero
	{
		for (let row of data) {
			let hasValue0OrMore = false;
			let hasValueGt0 = false;
			for (let i = 0; i < defs.length; i++) {
				let def = defs[i];
				let v = row.data[i];
				if (def.role != "metric") {
					continue;
				}
				if (v !== null) {
					hasValue0OrMore = true;
					if (v > 0) {
						hasValueGt0 = true;
					}
					break;
				}
			}
			if (!hasValue0OrMore) {
				let e = new RowError(
					row.id,
					"row_with_no_metric_value",
					ctx.t({
						code: "human_effects.error.row_with_no_metric_value",
						desc: "Error when a row has no values set for any metric.",
						msg: "Row has no values for metrics.",
					}),
				);
				rowErrors.push(e);
			} else if (!hasValueGt0) {
				let e = new RowError(
					row.id,
					"row_with_all_metrics_zeroes",
					ctx.t({
						code: "human_effects.error.row_with_all_metrics_zeroes",
						desc: "Warning when all metric values in a row are zero.",
						msg: "Row has zeroes for all metrics.",
					}),
				);
				rowErrors.push(e);
			}
		}
	}

	if (groupErrors.length || rowErrors.length) {
		return { ok: false, rowWarnings, groupWarnings, rowErrors, groupErrors };
	}

	return { ok: true, rowWarnings, groupWarnings };
}

export function groupTotals(defs: DefData[], data: DataWithIdBasic[]) {
	let res = new Map();
	for (let row of data) {
		let gk = rowToGroupKey(defs, row.data);
		if (!res.has(gk)) res.set(gk, new Map());
		let group = res.get(gk);
		for (let i = 0; i < row.data.length; i++) {
			let def = defs[i];
			if (def.role === "metric") {
				let value = row.data[i];
				let metricName = def.dbName;
				group.set(metricName, (group.get(metricName) || 0) + value);
			}
		}
	}
	return res;
}

export function groupKeyOnlyZeroes(key: GroupKey): boolean {
	return typeof key === "string" && /^0+$/.test(key);
}

function extractDimensions(defs: DefData[], data: any[]) {
	let i = 0;
	while (i < defs.length && defs[i].role === "dimension") i++;
	let firstMetric = i;
	if (i === 0) throw new Error("No dimensions found");
	while (i < defs.length) {
		if (defs[i].role !== "metric")
			throw new Error("Dimensions must come before metrics");
		i++;
	}
	return data.slice(0, firstMetric);
}

export function dataToGroupKey(data: any[]): string {
	return data.map((v) => (v !== null ? "1" : "0")).join("");
}

function groupKeyToDefs(defs: DefData[], gk: string): DefData[] {
	let result: DefData[] = [];
	let dimIndex = 0;

	for (let i = 0; i < gk.length; i++) {
		if (gk[i] === "1") {
			if (dimIndex >= defs.length || defs[dimIndex].role !== "dimension") {
				throw new Error("Invalid state: trying to access non-dimension def");
			}
			result.push(defs[dimIndex]);
		}
		dimIndex++;
	}
	return result;
}

function groupKeyToColNames(defs: DefData[], gk: string): string[] {
	return groupKeyToDefs(defs, gk).map(function (def) {
		return def.dbName;
	});
}

function rowToGroupKey(defs: DefData[], row: string[]): string {
	let dims = extractDimensions(defs, row);
	return dataToGroupKey(dims);
}

function sameDimentions(defs: DefData[], d1: any[], d2: any[]): boolean {
	for (let i = 0; i < defs.length; i++) {
		let def = defs[i];
		if (def.role != "dimension") {
			continue;
		}
		let a = d1[i];
		let b = d2[i];
		if (a != b) {
			return false;
		}
	}
	return true;
}
