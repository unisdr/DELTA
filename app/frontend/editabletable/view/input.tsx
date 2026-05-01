// Input renderer for table cells - handles enum, number, and date inputs.
// Part of the editable table UI - renders appropriate input controls based on column definition.
import { Def, DefEnum, etLocalizedStringForLang } from "~/frontend/editabletable/base";
import { toStandardDate } from "~/utils/date";

export function renderInput(
	def: Def,
	lang: string,
	rowId: string,
	value: any,
	colIndex: number,
	updateCell: (rowId: string, colIndex: number, value: any) => void,
	reSort: () => void,
	//groupKey: string
) {
	switch (def.format) {
		case "enum": {
			let enumDef = def as DefEnum;
			return (
				<select
					value={value ?? ""}
					onChange={(e) => {
						let v = e.target.value || null;
						updateCell(rowId, colIndex, v);
						//if (v !== null && groupKeyOnlyZeroes(groupKey)){
						//	reSort()
						//}
						reSort();
					}}
					className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#004F91] focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors w-full"
				>
					<option key="null" value="">
						-
					</option>
					{enumDef.data &&
						enumDef.data.map((option) => (
							<option key={option.key} value={option.key}>
								{etLocalizedStringForLang(option.label, lang)}
							</option>
						))}
				</select>
			);
		}
		case "number":
			return (
				<input
					type="text"
					value={value ?? ""}
					onChange={(e) => {
						let v = parseInt(e.target.value, 10);
						updateCell(rowId, colIndex, isNaN(v) ? null : v);
					}}
					className="px-3 py-1.5 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#004F91] focus:border-transparent w-full cursor-text"
				/>
			);
		case "date":
			console.log("value", value, toStandardDate(value));
			return (
				<input
					type="date"
					value={toStandardDate(value) ?? ""}
					onChange={(e) => {
						let v = e.target.value;
						updateCell(rowId, colIndex, v ? v : null);
					}}
				/>
			);
		default:
			throw "Unknown def type";
	}
}

