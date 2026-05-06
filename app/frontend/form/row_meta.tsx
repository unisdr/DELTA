import { UIRowWithDefs, FormInputDef } from "./types";interface rowMeta {
	header: any;
	emptyRepeatables: boolean;
	className: string;
}

export function rowMeta<T>(
	uiRow: UIRowWithDefs<T>,
	allDefs: FormInputDef<T>[],
	fields: Partial<T>,
): rowMeta {
	let cols = uiRow.defs.length;
	let className = "";
	let header;
	if (cols < 3) {
		cols = 3;
	}
	if (uiRow.defs.length == 1) {
		let def = uiRow.defs[0];
		if (def.key == "spatialFootprint" || def.key == "attachments") {
			cols = 1;
		}
		if (def.type == "textarea") {
			cols = 2;
		}
	}
	if (uiRow.uiRow) {
		if (uiRow.uiRow.colOverride) {
			cols = uiRow.uiRow.colOverride;
		}
		if (uiRow.uiRow.label) {
			header = (
				<h3 className={"row-header-" + uiRow.uiRowDefFromKey}>
					{uiRow.uiRow.label}
				</h3>
			);
		}
	}
	className = `mg-grid mg-grid__col-${cols}`;

	let emptyRepeatables = true;
	for (let def of uiRow.defs) {
		if (!def.repeatable) {
			emptyRepeatables = false;
		} else {
			// check if all are empty in this group and index
			let empty = true;
			for (let d of allDefs) {
				if (
					d.repeatable &&
					d.repeatable.group == def.repeatable.group &&
					d.repeatable.index == def.repeatable.index
				) {
					let v = fields[d.key];
					if (v !== null && v !== undefined && v !== "") {
						empty = false;
					}
				}
			}
			if (!empty) {
				emptyRepeatables = false;
			}
		}
	}

	return { className, emptyRepeatables, header };
}
