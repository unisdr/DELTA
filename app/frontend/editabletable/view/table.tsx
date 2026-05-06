// Main editable table component for human effects data entry.
// See _docs/human-direct-effects.md for overview.
// Manages state, data persistence, sorting, validation, and coordinates child components.
import { useEffect, useRef, useState } from "react";
import { Def, defData } from "~/frontend/editabletable/base";
import { DataManager, Sort, groupKeyOnlyZeroes, TotalGroupFlags, TotalGroupString } from "../data";
import { cloneInstance } from "~/utils/object";
import { HumanEffectsTable } from "~/frontend/human_effects/defs";
import { eqArr } from "~/utils/array";
import { ViewContext } from "../../context";
import { Toast } from "primereact/toast";
import { LangLink } from "~/utils/link";
import { TableActions } from "./actions";
import { TableCategoryPresence } from "./category_presence";
import { TableContent } from "./table_content";
import { TableLegend } from "./legend";

interface TableProps {
	ctx: ViewContext;
	recordId: string;
	table: HumanEffectsTable;
	initialIds: string[];
	initialData: any[][];
	initialTotalGroup: TotalGroupFlags;
	categoryPresence: Record<string, boolean | null>;
	defs: Def[];
}
export function Table(props: TableProps) {
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);
	if (!isClient) {
		return <p>Javascript must be enabled</p>;
	}
	return <TableClient {...props} />;
}

function colsFromDefs(defs: Def[]) {
	return {
		dimensions: defs.filter((d) => d.role == "dimension").length,
		metrics: defs.filter((d) => d.role == "metric").length,
	};
}

interface tableChildProps {
	defs: Def[];
	data: DataManager;
}

interface tableError {
	code: string;
	message: string;
	rowId: string;
}

const storageVersion = "v3";

function TableClient(props: TableProps) {
	let ctx = props.ctx;
	const toast = useRef<Toast>(null);

	const showErrorToast = (detail: string) => {
		toast.current?.show({
			severity: "error",
			detail,
			life: 5000,
		});
	};

	let [revertToIds, setRevertToIds] = useState(props.initialIds);
	let [revertToData, setRevertToData] = useState(props.initialData);
	let [revertToTotalGroup, setRevertToTotalGroup] = useState(
		props.initialTotalGroup,
	);

	function makeLocalStorageKey(recordId: string, table: string) {
		return `table-${recordId}-${table}-${storageVersion}`;
	}

	let [localStorageKey, setLocalStorageKey] = useState(
		makeLocalStorageKey(props.recordId, props.table),
	);

	function setLocalStorageKeyFromVars(recordId: string, table: string): string {
		let key = makeLocalStorageKey(recordId, table);
		setLocalStorageKey(key);
		return key;
	}

	let initDataManager = (key: string) => {
		let previousUpdates: any = {};
		//console.log("loading from", key)
		let storedData = localStorage.getItem(key);
		if (storedData) {
			try {
				previousUpdates = JSON.parse(storedData);
			} catch (err) {
				console.log("Error parsing previous update data", storedData, err);
			}
			let defNames = props.defs.map((d) => d.dbName);
			if (
				!previousUpdates.defNames ||
				!eqArr(defNames, previousUpdates.defNames)
			) {
				console.warn(
					"custom definitions for disaggregations changed, ignoring/deleting old data",
				);
				previousUpdates = {};
			}
		}
		let d = new DataManager();
		d.init(
			defData(props.defs),
			colsFromDefs(props.defs),
			props.initialData,
			props.initialIds,
			props.initialTotalGroup,
			previousUpdates,
		);
		console.log("inited table", props.table, props.defs.length);
		return d;
	};

	let [data, setData] = useState(() => initDataManager(localStorageKey));

	let [sort, setSort] = useState<Sort>({ column: 0, order: "asc" });

	let [childProps, setChildProps] = useState<tableChildProps | null>(null);

	let [tableErrors, setTableErrors] = useState<tableError[]>([]);

	let [categoryPresence, setCategoryPresence] = useState(
		props.categoryPresence,
	);

	useEffect(() => {
		setCategoryPresence(props.categoryPresence);
	}, [props.categoryPresence]);

	useEffect(() => {
		console.log("useEffect, props data changed");
		let key = setLocalStorageKeyFromVars(props.recordId, props.table);
		setData(initDataManager(key));
	}, [
		props.defs,
		props.initialData,
		props.initialIds,
		props.recordId,
		props.table,
	]);

	useEffect(() => {
		let dataUpdates = data.getUpdatesForSaving();
		dataUpdates.defNames = props.defs.map((d) => d.dbName);
		let json = JSON.stringify(dataUpdates);
		localStorage.setItem(localStorageKey, json);
		console.log("saving to", localStorageKey);

		setChildProps({ defs: props.defs, data: data });
	}, [data]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [data, sort]);

	const updateCell = (rowId: string, colIndex: number, value: any) => {
		console.log("updating cell", rowId, colIndex, value);
		data.updateField(rowId, colIndex, value);
		let def = props.defs[colIndex];
		if (def.role == "metric" && value) {
			setCategoryPresence((prev) => ({
				...prev,
				[def.jsName]: true,
			}));
		}
		setData(cloneInstance(data));
	};

	const updateTotals = (colIndex: number, value: any) => {
		data.updateTotals(colIndex, value);
		let cols = colsFromDefs(props.defs);
		let def = props.defs[cols.dimensions + colIndex];
		if (def.role == "metric" && value) {
			setCategoryPresence((prev) => ({
				...prev,
				[def.jsName]: true,
			}));
		}
		setData(cloneInstance(data));
	};

	const copyRow = (rowId: string) => {
		data.copyRow(rowId);
		setData(cloneInstance(data));
	};

	const deleteRow = (rowId: string) => {
		data.deleteRow(rowId);
		setData(cloneInstance(data));
	};

	const setTotalGroup = (totalGroup: TotalGroupString) => {
		if (totalGroup && groupKeyOnlyZeroes(totalGroup)) {
			showErrorToast(
				ctx.t({
					code: "human_effects.group_doesnt_have_disaggregations_set",
					msg: "Group does not have disaggregations set",
				}),
			);
			return;
		}
		data.setTotalGroupString(totalGroup);
		setData(cloneInstance(data));
	};

	const handleSave = async () => {
		console.log("Validating data in the browser");
		reSort();
		if (data.getTotalGroupString() == "invalid") {
			showErrorToast(
				ctx.t({
					code: "human_effects.select_group_to_use_as_source_for_total",
					msg: "Please select a group to use as source for total",
				}),
			);
			return;
		}
		let e = data.validate(ctx);
		if (e) {
			showErrorToast(String(e));
			return;
		}
		console.log("Saving data to server");
		let dataUpdates = data.getUpdatesForSaving();
		let json = JSON.stringify({
			columns: props.defs.map((d) => d.jsName),
			table: props.table,
			data: dataUpdates,
		});
		let resp = await fetch("./human-effects/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: json,
		});
		let res = await resp.json();
		if (!res.ok) {
			if (res.errors) {
				setTableErrors(res.errors);
			} else if (res.error) {
				showErrorToast(res.error.message + " (server)");
			} else {
				showErrorToast(
					ctx.t({
						code: "common.unknown_server_error",
						msg: "Unknown server error",
					}),
				);
			}
			return;
		}
		toast.current?.show({
			severity: "info",
			detail: ctx.t({
				code: "human_effects.your_changes_have_been_saved_on_server",
				msg: "Your changes have been saved on the server",
			}),
			life: 5000,
		});

		await reloadData();
	};

	const reloadData = async () => {
		let u = await fetch("./human-effects/load?tbl=" + props.table).then((res) =>
			res.json(),
		);
		let d = new DataManager();
		d.init(
			defData(props.defs),
			colsFromDefs(u.defs),
			u.data,
			u.ids,
			u.totalGroupFlags,
		);
		d.sortByColumn(sort.column, sort.order);
		setData(d);
		setTableErrors([]);
		setRevertToIds(u.ids);
		setRevertToData(u.data);
		setRevertToTotalGroup(u.totalGroupFlags);
	};

	const handleRevert = () => {
		let d = new DataManager();
		d.init(
			defData(props.defs),
			colsFromDefs(props.defs),
			revertToData,
			revertToIds,
			revertToTotalGroup,
		);
		setData(d);
		setTableErrors([]);
	};

	const handleClear = async () => {
		console.log("Clearing data");
		try {
			let resp = await fetch("./human-effects/clear?table=" + props.table, {
				method: "POST",
			});
			let res = await resp.json();
			if (!res.ok) {
				throw `Failed to clear data on the server: ${res.error.message}`;
			}
			console.log("Data successfully cleared");
			await reloadData();
		} catch (error) {
			alert("Error clearing data:" + error);
		}
	};

	const reSort = () => {
		let sort = data.getSort();
		data.sortByColumn(sort.column, sort.order);
		setData(cloneInstance(data));
	};

	const toggleColumnSort = (colIndex: number) => {
		data.toggleColumnSort(colIndex);
		setData(cloneInstance(data));
		setSort(data.getSort());
	};

	const addRowStart = () => {
		data.addRow("start");
		setData(cloneInstance(data));
	};

	const addRowEnd = () => {
		data.addRow("end");
		setData(cloneInstance(data));
	};

	if (!childProps) {
		return <p>Loading</p>;
	}

	let categoryPresenceAtLeastOneYes = Object.values(categoryPresence).some(
		(v) => v,
	);

	return (
		<div className="table-container">
			<Toast ref={toast} position="top-center" />
			<TableCategoryPresence
				ctx={props.ctx}
				tblId={props.table}
				defs={childProps.defs}
				data={categoryPresence}
			/>
			{categoryPresenceAtLeastOneYes && (
				<>
					<h3>
						{ctx.t({ code: "human_effects.numeric_data", msg: "Numeric data" })}
					</h3>
					<TableActions
						ctx={ctx}
						onSave={handleSave}
						onRevert={handleRevert}
						onClear={handleClear}
						addRowStart={addRowStart}
						reSort={reSort}
						csvExportUrl={"./human-effects/csv-export?table=" + props.table}
						csvImportUrl={"./human-effects/csv-import?table=" + props.table}
					/>
					{childProps.data.hasUnsavedChanges() && (
						<p>
							{ctx.t({
								code: "human_effects.you_have_unsaved_changes",
								msg: "You have unsaved changes",
							})}
						</p>
					)}
					<TableContent
						ctx={props.ctx}
						tableErrors={tableErrors}
						sort={sort}
						totals={childProps.data.getTotals()?.data ?? null}
						groupTotals={childProps.data.groupTotals()}
						data={childProps.data.applyUpdatesWithGroupKey()}
						defs={childProps.defs}
						setTotalGroup={setTotalGroup}
						updateTotals={updateTotals}
						updateCell={updateCell}
						copyRow={copyRow}
						deleteRow={deleteRow}
						toggleColumnSort={toggleColumnSort}
						addRowEnd={addRowEnd}
						totalGroup={childProps.data.getTotalGroupString()}
						reSort={reSort}
					/>
					<TableLegend ctx={ctx} />
					<LangLink
						lang={ctx.lang}
						to="/settings/human-effects-dsg"
						className="text-[#00afae] hover:text-blue-800 underline mb-4 inline-block"
					>
						{ctx.t({
							code: "human_effects.configure_disaggregations",
							msg: "Configure disaggregations",
						})}
					</LangLink>
				</>
			)}
		</div>
	);
}


