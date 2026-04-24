// Table action buttons component (Save, Revert, Clear, Add row, CSV export/import)
// Part of the editable table UI - handles user interactions for table operations.
import { ViewContext } from "../../context";

interface TableActionsProps {
	ctx: ViewContext;
	onSave: () => void;
	onRevert: () => void;
	addRowStart: () => void;
	onClear: () => void;
	reSort: () => void;
	csvExportUrl: string;
	csvImportUrl: string;
}

export function TableActions(props: TableActionsProps) {
	const ctx = props.ctx;
	return (
		<div className="dts-table-actions dts-table-actions-main">
			<button
				onClick={props.addRowStart}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "human_effects.add_row", msg: "Add row" })}
			</button>

			<button
				onClick={props.onSave}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.save", msg: "Save" })}
			</button>

			<button
				onClick={props.onClear}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.clear", msg: "Clear" })}
			</button>

			<button
				onClick={props.onRevert}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.revert", msg: "Revert" })}
			</button>

			<a
				href={props.csvExportUrl}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.csv_export", msg: "CSV export" })}
			</a>

			<a
				href={props.csvImportUrl}
				className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-black bg-gray-100 hover:bg-gray-200 hover:cursor-pointer active:scale-[0.98] transition-colors text-gray-800 mx-1"
			>
				{ctx.t({ code: "common.csv_import", msg: "CSV import" })}
			</a>
		</div>
	);
}

