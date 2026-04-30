// Table content component - renders the table body with groups, rows, and totals.
// Part of the editable table UI - handles row rendering, group totals, and cell display.
import React from "react";
import { Def, ColWidth, etLocalizedStringForLang } from "~/frontend/editabletable/base";
import { DataWithId, Group, flattenGroups, Sort, TotalGroupString } from "../data";
import { ViewContext } from "../../context";
import { validate } from "../validate";
import { renderInput } from "./input";

interface tableError {
	code: string;
	message: string;
	rowId: string;
}

interface TableContentProps {
	ctx: ViewContext;
	totals: any[] | null;
	groupTotals: null | Map<string, number[]>;
	data: Group<DataWithId>[];
	defs: Def[];
	updateCell: (rowId: string, colIndex: number, value: any) => void;
	updateTotals: (colIndex: number, value: any) => void;
	copyRow: (rowId: string) => void;
	deleteRow: (rowId: string) => void;
	setTotalGroup: (groupKey: TotalGroupString) => void;
	toggleColumnSort: (colIndex: number) => void;
	sort: Sort;
	addRowEnd: () => void;
	tableErrors: tableError[];
	totalGroup: string | null;
	reSort: () => void;
}

function colWidth(colWidth: ColWidth | undefined): number {
	if (!colWidth) {
		colWidth = "wide";
	}
	switch (colWidth) {
		case "thin":
			return 60;
		case "medium":
			return 90;
		case "wide":
			return 120;
		default:
			return 120;
		//throw new Error("Invalid colWidth")
	}
}

export function TableContent(props: TableContentProps) {
	const ctx = props.ctx;

	const renderHeader = () => (
		<thead>
			<tr>
				{props.defs.map((def, index) => (
					<React.Fragment key={index}>
						<th
							style={{ width: colWidth(def.uiColWidth) + "px" }}
							className={
								props.sort.column === index
									? props.sort.order === "asc"
										? "asc"
										: "desc"
									: ""
							}
						>
							<a
								href="#"
								onClick={(e) => {
									e.preventDefault();
									props.toggleColumnSort(index);
								}}
							>
								{etLocalizedStringForLang(def.uiName, ctx.lang)}
							</a>
						</th>
						{/*def.role === "metric" && <th style={{width: "30px"}}>%</th>*/}
					</React.Fragment>
				))}
				<th style={{ width: "100px" }}>
					{ctx.t({ code: "common.actions", msg: "Actions" })}
				</th>
			</tr>
		</thead>
	);

	const renderTotalRow = () => (
		<tbody key="totals">
			<tr>
				<td className="totals">
					{ctx.t({ code: "human_effects.totals", msg: "Totals" })}
				</td>

				<td className="dts-editable-table-calc-type" colSpan={dimCount() - 1}>
					<label>
						<input
							type="radio"
							name="dts-editable-table-calc-type"
							value="manual"
							checked={props.totalGroup === null}
							onChange={() => props.setTotalGroup(null)}
						/>
						{ctx.t({
							code: "human_effects.manually_calculate_total",
							msg: "Manually calculate total",
						})}
					</label>
					<label>
						<input
							type="radio"
							name="dts-editable-table-calc-type"
							value="auto"
							checked={props.totalGroup !== null}
							onChange={() => props.setTotalGroup("invalid")}
						/>
						{ctx.t({
							code: "human_effects.automatically_calculate_total",
							msg: "Automatically calculate total",
						})}
					</label>
				</td>

				{props.defs
					.filter((d) => d.role == "metric")
					.map((_, colIndex) => {
						let v = "";
						if (props.totals) {
							v = props.totals[colIndex];
						}
						return (
							<React.Fragment key={colIndex}>
								<td>
									{props.totalGroup ? (
										<input
											type="text"
											value={v ?? ""}
											disabled
											className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed w-full"
										/>
									) : (
										<input
											type="text"
											value={v ?? ""}
											onChange={(e) => {
												let v = parseInt(e.target.value, 10);
												props.updateTotals(colIndex, isNaN(v) ? null : v);
											}}
											className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004F91] focus:border-transparent w-full cursor-text"
										/>
									)}
								</td>
							</React.Fragment>
						);
					})}
			</tr>
		</tbody>
	);

	const columnCount = () => {
		let colCount = 0;
		for (let def of props.defs) {
			if (def.role == "dimension") {
				colCount++;
			} else if (def.role == "metric") {
				colCount++;
			} else {
				console.log("unknown def type", def);
			}
		}
		colCount += 1;
		return colCount;
	};

	const dimCount = () => {
		let r = 0;
		for (let def of props.defs) {
			if (def.role == "dimension") {
				r++;
			} else {
				break;
			}
		}
		return r;
	};

	const renderGroupRows = () => {
		let dataNoGroups = flattenGroups(props.data);
		let valid = validate(ctx, props.defs, dataNoGroups, props.totals);

		if (!valid.ok && valid.tableError) {
			console.error("table error", valid.tableError);
		}
		//console.log("validation results", dataNoGroups, valid)

		return props.data.map((group, groupI) => {
			let groupTotals: null | number[] = null;
			if (props.groupTotals) {
				groupTotals = props.groupTotals.get(group.key)!;
			}

			let colCount = columnCount();
			let disaggr: string[] = [];
			for (let i = 0; i < group.key.length; i++) {
				let c = group.key[i];
				if (c == "1") {
					let def = props.defs[i];
					disaggr.push(etLocalizedStringForLang(def.uiName, ctx.lang));
				}
			}
			let disaggrLabels = disaggr.join(", ");

			let errors = new Map<string, tableError>();
			for (let e of props.tableErrors) {
				errors.set(e.rowId, e);
			}

			let hasDateValue = false;
			for (let row of group.data) {
				let data = row.data;
				if (data.length !== props.defs.length) {
					throw new Error(
						`Row length does not match defs length: data ${data.length}, defs ${props.defs.length}`,
					);
				}

				for (let i = 0; i < props.defs.length; i++) {
					let def = props.defs[i];
					if (def.format !== "date") continue;
					let v = data[i];
					if (v) {
						hasDateValue = true;
						break;
					}
				}
			}

			return (
				<tbody key={groupI} className="group">
					<tr className="spacing-row">
						<td colSpan={colCount}>
							{ctx.t({
								code: "human_effects.disaggregations",
								msg: "Disaggregations",
							})}
							: {disaggrLabels || ctx.t({ code: "common.none", msg: "None" })}
						</td>
					</tr>
					{group.data.map((row) => {
						let id = row.id;
						let data = row.data;
						let error = errors.get(id) || null;
						if (data.length !== props.defs.length) {
							throw new Error(
								`Row length does not match defs length data ${data.length} defs ${props.defs.length}`,
							);
						}

						let thisRowHasError = (() => {
							if (valid.ok) return false;
							if (!valid.rowErrors) return false;
							for (const error of valid.rowErrors) {
								if (error.rowId === id) {
									return true;
								}
							}
							return false;
						})();

						let rowClassName = "";
						if (thisRowHasError) {
							rowClassName = "dts-error";
						}

						return (
							<React.Fragment key={id}>
								{error && (
									<tr>
										<td className="total" colSpan={colCount}>
											{error.message}
										</td>
									</tr>
								)}
								<tr className={rowClassName} key={id}>
									{props.defs.map((def, colIndex) => {
										let cellClassName = null;
										if (error) {
											cellClassName = "";
										} else {
											if (!hasDateValue) {
												if (def.role == "metric") {
													let metricIndex = colIndex - dimCount();
													if (groupTotals) {
														let v = groupTotals[metricIndex];
														if (props.totals) {
															let t = props.totals[metricIndex];
															if (v < t) {
																cellClassName = "dts-warning";
															} else if (v > t) {
																cellClassName = "dts-error";
															}
														} else {
															cellClassName = "dts-error";
														}
													}
												}
											}
										}
										return renderCell(
											def,
											row,
											colIndex,
											cellClassName /*, group.key*/,
										);
									})}
									<td className="dts-table-actions">{renderRowActions(id)}</td>
								</tr>
							</React.Fragment>
						);
					})}
					<tr className="spacing-row dts-editable-table-group-total">
						{hasDateValue && (
							<td colSpan={colCount}>
								<span className="total-label">
									{ctx.t({
										code: "human_effects.group_total",
										msg: "Group total:",
									})}
								</span>
								{/*
						<a href="#" onClick={(e) => {
							e.preventDefault()
							props.reSort()
						}}>
							Sort
						</a>
						*/}
								<span className="dts-notice">
									{ctx.t({
										code: "human_effects.group_total_cannot_calculate_as_of_date",
										msg: 'Group total cannot be calculated, because a value in "As of" date is set.',
									})}
								</span>
							</td>
						)}

						{!hasDateValue &&
							props.defs.map((def, colIndex) => {
								const colsForLabel = dimCount();

								if (colIndex == 0) {
									let errorMsgStr = (() => {
										if (valid.ok) return "";
										if (!valid.groupErrors) return "";
										for (const error of valid.groupErrors) {
											if (error.groupKey === group.key) {
												return error.message;
											}
										}
										return "";
									})();

									let warningMsgStr = (() => {
										if (!valid.groupWarnings) return "";
										for (const error of valid.groupWarnings) {
											//console.log("checking", error.groupKey, group.key)
											if (error.groupKey === group.key) {
												return error.message;
											}
										}
										return "";
									})();

									let errorMsg;
									if (errorMsgStr) {
										errorMsg = <span className="dts-error">{errorMsgStr}</span>;
									}
									let warningMsg;
									if (warningMsgStr) {
										warningMsg = (
											<span className="dts-warning">{warningMsgStr}</span>
										);
									}

									const isUsedAsTotal = group.key == props.totalGroup;

									return (
										<td key={colIndex} colSpan={colsForLabel}>
											<span className="total-label">
												{ctx.t({
													code: "human_effects.group_total",
													msg: "Group total:",
												})}
											</span>
											{/*
									<a href="#" onClick={(e) => {
										e.preventDefault()
										props.reSort()
									}}>
										Sort
									</a>
									*/}
											<label>
												<input
													type="checkbox"
													checked={isUsedAsTotal}
													onChange={(e) => {
														const checked = e.target.checked;
														props.setTotalGroup(
															checked ? group.key : "invalid",
														);
													}}
												/>
												{ctx.t({
													code: "human_effects.use_as_total",
													msg: "Use as total",
												})}
											</label>
											{warningMsg}
											{errorMsg}
										</td>
									);
								}
								if (colIndex < colsForLabel) {
									return null;
								}

								if (def.role == "metric") {
									let metricIndex = colIndex - dimCount();
									let className = "";
									if (groupTotals) {
										let v = groupTotals[metricIndex];
										if (props.totals) {
											let t = props.totals[metricIndex];
											if (v < t) {
												className = "dts-warning";
											} else if (v > t) {
												className = "dts-error";
											}
										} else {
											className = "dts-error";
										}
										return (
											<td key={colIndex} className="group-total">
												<span className={className}>{v}</span>
											</td>
										);
									} else {
										return (
											<td key={colIndex} className="group-total">
												{ctx.t({
													code: "human_effects.missing_group_total",
													msg: "Missing group total",
												})}
											</td>
										);
									}
								}
								return <td key={colIndex}></td>;
							})}
						<td></td>
					</tr>
				</tbody>
			);
		});
	};

	const renderCell = (
		def: Def,
		row: DataWithId,
		colIndex: number,
		className: string | null /*, groupKey: string*/,
	) => {
		let t = row.from[colIndex];
		let v = row.data[colIndex];
		if (className === null) {
			switch (t) {
				case "i":
					className = "dts-init";
					break;
				case "u":
					className = "dts-update";
					break;
				case "n":
					className = "dts-new";
					break;
			}
		}
		return (
			<React.Fragment key={colIndex}>
				<td className={className}>
					{renderInput(
						def,
						ctx.lang,
						row.id,
						v,
						colIndex,
						props.updateCell,
						props.reSort /*, groupKey*/,
					)}
				</td>
				{/*def.role === "metric" && <td className={className}>{totalPercV(v, colIndex)}</td>*/}
			</React.Fragment>
		);
	};

	/*
	const totalPercV = (v: number, colIndex: number) => {
		let n = Math.round((v / totalPerc(colIndex)) * 100)
		if (!isFinite(n)) {
			return "-"
		}
		if (n > 100) {
			return ">100%"
		} else if (n < -100) {
			return "<-100%"
		}
		return n + "%"
	}

	const totalPerc = (colIndex: number) => {
		let metricIndex = 0
		for (let [i, def] of props.defs.entries()) {
			if (i == colIndex) {
				return props.totals[metricIndex] as number
			}
			if (def.role == "metric") {
				metricIndex++
			}
		}
		throw new Error("invalid colIndex")
	}
 */

	const renderRowActions = (id: string) => (
		<>
			<button
				onClick={() => props.copyRow(id)}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.copy", msg: "Copy" })}
			</button>
			<button
				onClick={() => props.deleteRow(id)}
				className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 h-[32px] text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-red-100 hover:border-red-500 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				<i className="pi pi-trash text-gray-700" />
			</button>
		</>
	);

	const renderAddRow = () => {
		let colCount = columnCount();
		return (
			<tbody key="_end">
				<tr>
					<td colSpan={colCount - 1}></td>
					<td className="dts-table-actions">
						<button
							onClick={() => props.addRowEnd()}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
						>
							{ctx.t({ code: "common.add", msg: "Add" })}
						</button>
					</td>
				</tr>
			</tbody>
		);
	};

	return (
		<table className="dts-table dts-editable-table">
			{renderHeader()}
			{renderTotalRow()}
			{renderGroupRows()}
			{renderAddRow()}
		</table>
	);
}




