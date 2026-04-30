import { ReactElement } from "react";
import React from "react";
import { ViewContext } from "../context";
import { UserForFrontend } from "~/utils/auth";
import { type FormInputDef, splitDefsIntoRows } from "./types";
import { rowMeta } from "./row_meta";
import { errorsToStrings, type Errors } from "./form_components";
import { Input } from "./input";

export interface InputsProps<T> {
	ctx: ViewContext;
	user?: UserForFrontend;
	def: FormInputDef<T>[];
	fields: Partial<T>;
	errors?: Errors<T>;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>;
	id?: string;
}



export function Inputs<T>(props: InputsProps<T>) {
	const ctx = props.ctx;
	if (!props.def) {
		throw new Error("props.def not passed to form/Inputs");
	}
	if (!Array.isArray(props.def)) {
		throw new Error("props.def must be an array");
	}

	let defs = props.def;
	//if (props.user?.role != "admin") {
	// only show this in view
	defs = defs.filter((d) => d.key != "legacyData");
	//}

	let uiRows = splitDefsIntoRows(defs);

	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow, defs, props.fields);
		let afterRow = null;
		let addMore: any[] = [];

		return (
			<React.Fragment key={rowIndex}>
				{meta.header}
				<div key={`div-${rowIndex}-random`} className={meta.className}>
					{uiRow.defs.map((def, defIndex) => {
						if (def.repeatable) {
							let index = defs.findIndex((d) => d.key == def.key);
							let shouldAdd = false;
							let g = def.repeatable.group;
							let repIndex = def.repeatable.index;
							if (index < defs.length - 1) {
								let next = defs[index + 1];
								if (
									next.repeatable &&
									(next.repeatable.group != g ||
										next.repeatable.index != repIndex)
								) {
									shouldAdd = true;
								}
							}
							if (shouldAdd) {
								let cla = "repeatable-add-" + g + "-" + repIndex;
								addMore.push(
									<button key={cla} className={cla}>
										{ctx.t({
											code: "common.add",
											msg: "Add",
										})}
									</button>,
								);
							}
						}
						let after = null;
						if (props.elementsAfter && props.elementsAfter[def.key]) {
							if (defIndex == uiRow.defs.length - 1) {
								afterRow = props.elementsAfter[def.key];
							} else {
								after = props.elementsAfter[def.key];
							}
						}
						if (props.override && props.override[def.key] !== undefined) {
							return (
								<React.Fragment key={def.key}>
									{props.override[def.key]}
									{after}
								</React.Fragment>
							);
						}
						let errors: string[] | undefined;
						if (props.errors && props.errors.fields) {
							errors = errorsToStrings(props.errors.fields[def.key]);
						}
						return (
							<React.Fragment key={def.key}>
								{def.key === "approvalStatus" &&
									props.id == undefined ? null : (
									<>
										<Input
											ctx={ctx}
											user={props.user}
											key={def.key}
											def={def}
											name={def.key}
											value={props.fields[def.key]}
											errors={errors}
											enumData={def.enumData}
										/>
										{after}
									</>
								)}
							</React.Fragment>
						);
					})}
				</div>
				{addMore}
				{afterRow}
			</React.Fragment>
		);
	});
}

