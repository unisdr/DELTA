import React, { useState, useEffect, ReactElement } from "react";
import { formatDate, formatDateTimeUTC } from "~/utils/date";
import { UserForFrontend } from "~/utils/auth";
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite";
import { type FormInputDef, type FormInputDefSpecific, splitDefsIntoRows } from "./types";
import { rowMeta } from "./row_meta";
import { ViewContext } from "../context";

export interface ViewPropsBase<T> {
	ctx: ViewContext;
	def: FormInputDef<T>[];
}

export interface FieldsViewProps<T> {
	def: FormInputDef<T>[];
	fields: T;
	elementsAfter?: Record<string, ReactElement>;
	override?: Record<string, ReactElement | undefined | null>;
	user?: UserForFrontend;
}

export function FieldsView<T>(props: FieldsViewProps<T>) {
	if (!props.def) {
		throw new Error("props.def not passed to view");
	}
	let defs = props.def;
	if (props.user?.role != "admin") {
		defs = defs.filter((d) => d.key != "legacyData");
	}

	let uiRows = splitDefsIntoRows(defs);
	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow, defs, props.fields);
		let afterRow = null;
		return (
			<React.Fragment key={rowIndex}>
				{!meta.emptyRepeatables && meta.header}
				<div className={meta.className}>
					{uiRow.defs.map((def, defIndex) => {
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
						if (def.repeatable) {
							// check if all are empty in this group and index
							let empty = true;
							for (let d of defs) {
								if (
									d.repeatable &&
									d.repeatable.group == def.repeatable.group &&
									d.repeatable.index == def.repeatable.index
								) {
									let v = props.fields[d.key];
									if (v !== null && v !== undefined && v !== "") {
										empty = false;
									}
								}
							}
							if (empty) {
								return <React.Fragment key={def.key}>{after}</React.Fragment>;
							}
						}
						return (
							<React.Fragment key={def.key}>
								<FieldView
									key={def.key}
									def={def}
									value={props.fields[def.key]}
								/>
								{after}
							</React.Fragment>
						);
					})}
				</div>
				{afterRow}
			</React.Fragment>
		);
	});
}
export interface FieldViewProps {
	def: FormInputDefSpecific;
	value: any;
}

export function FieldView(props: FieldViewProps) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// skip display for type temp_hidden
	if (props.def.type === "temp_hidden") {
		return "";
	}

	if (props.value === null || props.value === undefined) {
		return <p>{props.def.label}: -</p>;
	}
	switch (props.def.type) {
		default:
			throw new Error(
				`Unknown type ${props.def.type} for field ${props.def.key}`,
			);
		case "bool":
			let b = props.value as boolean;
			return (
				<p>
					{props.def.label}: {String(b)}
				</p>
			);
		case "number":
			let n = props.value as number;
			return (
				<p>
					{props.def.label}: {String(n)}
				</p>
			);
		case "uuid":
		case "textarea":
		case "text":
		case "money":
		case "date_optional_precision":
			if (typeof props.value !== "string") {
				throw new Error(
					`invalid data for field ${props.def.key}, not a string, got: ${props.value}`,
				);
			}
			let str = props.value as string;
			if (!str.trim()) {
				return <p>{props.def.label}: -</p>;
			}
			return (
				<p>
					{props.def.label}: {str}
				</p>
			);
		case "date": {
			let date = props.value as Date;
			return (
				<p>
					{props.def.label}: {formatDate(date)}
				</p>
			);
		}
		case "datetime": {
			let date = props.value as Date;
			return (
				<p>
					{props.def.label}: {formatDateTimeUTC(date)}
				</p>
			);
		}
		case "approval_status":
		case "enum":
		case "enum-flex": {
			let enumId = props.value;
			let enumItem = props.def.enumData!.find((item) => item.key === enumId);
			if (!enumItem) {
				return (
					<p>
						{props.def.label}: {enumId}
					</p>
				);
			}
			return (
				<p>
					{props.def.label}: {enumItem.label}
				</p>
			);
		}
		case "json": {
			if (!isClient) {
				let data = JSON.stringify(props.value);
				return (
					<>
						<p>{props.def.label}</p>
						<pre>{data}</pre>
					</>
				);
			}
			return (
				<>
					<p>{props.def.label}</p>
					<JsonView
						data={props.value}
						shouldExpandNode={allExpanded}
						style={defaultStyles}
					/>
				</>
			);
		}
	}
}

