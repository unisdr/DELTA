// Types and utility functions for form handling
// These are separated to avoid circular dependencies between form.tsx and form_view.tsx

export type FormInputType =
	| "text"
	| "textarea"
	| "date"
	| "date_optional_precision" // yyyy,yyyy-mm,yyyy-mm-dd
	| "datetime"
	| "number"
	| "money"
	| "bool"
	| "other"
	| "approval_status"
	| "enum"
	| "enum-flex" // enum-flex - similar to enum but allows values that are not in the list, useful for when list of allowed values changed due to configuration changes
	| "json"
	| "uuid"
	| "temp_hidden"; // uuid referencing another table

export interface EnumEntry {
	key: string;
	label: string;
}

export interface UIRow {
	label?: string;
	// normally uses cols matching definiton, adjust if you add cols afterwards
	colOverride?: number;
}

export interface FormInputDef<T> {
	key: keyof T & string;
	label: string;
	type: FormInputType;
	required?: boolean;
	tooltip?: string;
	description?: string;
	mcpDescription?: string;
	enumData?: readonly EnumEntry[];
	psqlType?: string;
	uiRow?: UIRow;
	uiRowNew?: boolean;
	repeatable?: { group: string; index: number };
}

export interface FormInputDefSpecific {
	key: string;
	label: string;
	type: FormInputType;
	required?: boolean;
	tooltip?: string;
	description?: string;
	enumData?: readonly EnumEntry[];
}
export interface UIRowWithDefs<T> {
	uiRow?: UIRow;
	uiRowDefFromKey?: string;
	defs: FormInputDef<T>[];
}

export function splitDefsIntoRows<T>(defs: FormInputDef<T>[]) {
	let uiRows: UIRowWithDefs<T>[] = [];
	{
		let uiRow: UIRowWithDefs<T> = {
			defs: [],
		};
		let onePerRow = true;
		for (let d of defs) {
			if (d.uiRow) {
				onePerRow = false;
			} else if (d.uiRowNew) {
				onePerRow = true;
			}
			if (d.uiRow || onePerRow) {
				if (uiRow.defs.length) {
					uiRows.push(uiRow);
				}
				if (d.uiRow) {
					uiRow = {
						uiRow: d.uiRow,
						uiRowDefFromKey: d.key,
						defs: [],
					};
				} else {
					uiRow = {
						defs: [],
					};
				}
			}
			uiRow.defs.push(d);
		}
		if (uiRow.defs.length) {
			uiRows.push(uiRow);
		}
	}
	return uiRows;
}
