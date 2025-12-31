import { Form as ReactForm, useNavigation } from "@remix-run/react";

import { useActionData } from "@remix-run/react";
import { ReactElement, useRef, useState, useEffect } from "react";

import {
	formatDate,
	formatDateTimeUTC,
	formatForDateTimeInput,
	getMonthName,
} from "~/util/date";
import { MainContainer } from "./container";

import { capitalizeFirstLetter } from "~/util/string";

import React from "react";

import * as repeatablefields from "~/frontend/components/repeatablefields";

import { UserForFrontend } from "~/util/auth";
import { notifyError } from "./utils/notifications";

import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite";

import { DeleteButton } from "./components/delete-dialog";
import { ViewContext } from "./context";
import { CommonData } from "~/backend.server/handlers/commondata";
import { LangLink } from "~/util/link";
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from "primereact/checkbox";
import { useFetcher } from "@remix-run/react";
import { approvalStatusIds } from "~/frontend/approval";

export type FormResponse<T> =
	| { ok: true; data: T }
	| { ok: false; data: T; errors: Errors<T> };

export type FormResponse2<T> =
	| ({ ok: true; data: Partial<T> } & CommonData)
	| ({ ok: false; data: Partial<T>; errors: Errors<T> } & CommonData);

export interface FormError {
	def?: FormInputDefSpecific;
	code: string;
	message: string;
	data?: any;
}

export function errorToString(error: string | FormError): string {
	return typeof error === "string" ? error : error.message;
}

export function errorsToCodes(
	errors: (string | FormError)[] | undefined
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? "unknown_error" : error.code
	);
}

export function errorsToStrings(
	errors: (string | FormError)[] | undefined
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? error : error.message
	);
}

export interface Errors<T> {
	form?: (string | FormError)[];
	fields?: Partial<Record<keyof T, (string | FormError)[]>>;
	general?: string[];
}

export function initErrorField<T>(errors: Errors<T>, field: keyof T): string[] {
	errors.fields = errors.fields || {};
	errors.fields[field] = errors.fields[field] || [];
	return errors.fields[field] as string[];
}

export function firstError<T>(
	errors: Errors<T> | undefined
): FormError | string | null {
	if (!errors) {
		return null;
	}
	if (errors.form && errors.form.length > 0) {
		return errors.form[0];
	}
	if (errors.fields) {
		for (const field in errors.fields) {
			if (errors.fields[field]) {
				if (errors.fields[field]!.length > 0) {
					return errors.fields[field]![0];
				}
			}
		}
	}
	return null;
}

export function hasErrors<T>(errors: Errors<T> | undefined): boolean {
	if (!errors) {
		return false;
	}
	if (errors.form && errors.form.length > 0) {
		return true;
	}
	if (errors.fields) {
		for (const field in errors.fields) {
			if (errors.fields[field]) {
				if (errors.fields[field]!.length > 0) {
					return true;
				}
			}
		}
	}
	return false;
}

interface FormMessageProps {
	children: React.ReactNode;
}

export function FormMessage({ children }: FormMessageProps) {
	return <div className="form-message">{children}</div>;
}

interface FieldProps {
	children: React.ReactNode;
	label: string;
	extraClassName?: string;
}

export function Field({ children, label, extraClassName }: FieldProps) {
	if (extraClassName && extraClassName?.indexOf("dts-form-component") >= 0) {
		return (
			<div className={extraClassName}>
				<label>
					{label}
					{children}
				</label>
			</div>
		);
	} else {
		return (
			<div
				className={
					extraClassName ? `form-field ${extraClassName}` : "form-field"
				}
			>
				<label>
					{label}
					<div>{children}</div>
				</label>
			</div>
		);
	}
}

interface FieldErrorsProps<T> {
	errors?: Errors<T>;
	field: keyof T;
}

export function FieldErrorsStandard<T>({ errors, field }: FieldErrorsProps<T>) {
	if (!errors || !errors.fields) {
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0) {
		return null;
	}

	if (!errors) {
		return null;
	}

	return FieldErrors3({ errors: errorsToStrings(fieldErrors) });
}

export function FieldErrors<T>({ errors, field }: FieldErrorsProps<T>) {
	if (!errors || !errors.fields) {
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0) {
		return null;
	}
	return FieldErrors2({ errors: errorsToStrings(fieldErrors) });
}

interface FieldErrors2Props {
	errors: string[] | undefined;
}

export function FieldErrors2({ errors }: FieldErrors2Props) {
	if (!errors) {
		return null;
	}

	return (
		<ul className="form-field-errors">
			{errors.map((error, index) => (
				<li style={{ color: "red" }} key={index}>
					{error}
				</li>
			))}
		</ul>
	);
}

export function FieldErrors3({ errors }: FieldErrors2Props) {
	if (!errors) {
		return null;
	}

	return (
		<>
			<div className="dts-form-component__hint">
				<div className="dts-form-component__hint--error" aria-live="assertive">
					{errors.map((error, index) => (
						<span key={index}>
							{index > 0 && ", "}
							{error}
						</span>
					))}
				</div>
			</div>
		</>
	);
}

interface SubmitButtonProps {
	label: string;
	id?: React.HTMLProps<HTMLButtonElement>["id"];
	className?: string;
	disabled?: boolean;
	style?: React.CSSProperties; // Allow inline styles
}

export function SubmitButton({
	label,
	id = undefined,
	disabled = false,
	className = "mg-button mg-button-primary",
	style = {}, // Default to an empty style object
}: SubmitButtonProps) {
	return (
		<button
			id={id}
			disabled={disabled}
			className={className}
			style={{
				...style, // Use passed styles
				flex: "none", // Prevent stretching within flex containers
			}}
			type="submit"
		>
			{label}
		</button>
	);
}

interface FormProps<T> {
	ctx: ViewContext;

	children: React.ReactNode;
	id?: React.HTMLProps<HTMLFormElement>["id"];
	errors?: Errors<T>;
	className?: string;
	formRef?: React.Ref<HTMLFormElement>;
}

export function Form<T>(props: FormProps<T>) {
	let ctx = props.ctx;
	let errors = props.errors || {};
	errors.form = errors.form || [];

	return (
		<ReactForm
			id={props.id}
			ref={props.formRef}
			method="post"
			className={props.className}
		>
			{errors.form.length > 0 ? (
				<>
					<h2>{ctx.t({ "code": "common.form_errors", "msg": "Form errors" })}</h2>
					<ul className="form-errors">
						{errorsToStrings(errors.form).map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</>
			) : null}
			<div className="fields">{props.children}</div>
		</ReactForm>
	);
}

export interface UserFormProps<T> {
	ctx: ViewContext;

	fieldDef?: FormInputDef<T>[];
	edit: boolean;
	id: any; // only valid when edit is true
	fields: Partial<T>;
	errors?: Errors<T>;

	user?: UserForFrontend;
}

export interface FormScreenOpts<T, D> {
	ctx: ViewContext;

	extraData: D;
	fieldsInitial: Partial<T>;
	form: React.FC<UserFormProps<T> & D>;
	edit: boolean;
	id?: any;
	usersWithValidatorRole?: any; // Add appropriate type here
}

export function formScreen<T, D>(opts: FormScreenOpts<T, D>) {
	let fields = opts.fieldsInitial;
	let errors = {};
	const actionData = useActionData() as FormResponse<T>;
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			errors = actionData.errors;
		}
	}
	const mergedProps = {
		ctx: opts.ctx,
		...opts.extraData,
		edit: opts.edit,
		fields: fields,
		errors: errors,
		id: opts.id,
		usersWithValidatorRole: opts.usersWithValidatorRole,
	};
	return opts.form(mergedProps);
}

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
	| "table_uuid" // uuid referencing another table
	;

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

interface UIRowWithDefs<T> {
	uiRow?: UIRow;
	uiRowDefFromKey?: string;
	defs: FormInputDef<T>[];
}

function splitDefsIntoRows<T>(defs: FormInputDef<T>[]) {
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

interface rowMeta {
	header: any;
	emptyRepeatables: boolean;
	className: string;
}

function rowMeta<T>(
	uiRow: UIRowWithDefs<T>,
	allDefs: FormInputDef<T>[],
	fields: Partial<T>
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
											"code": "common.add",
											"msg": "Add"
										})}
									</button>

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
								{def.key === "approvalStatus" && props.id == undefined ? null : (
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

export interface WrapInputProps {
	def: FormInputDefSpecific;
	child: React.ReactNode;
	errors: string[] | undefined;
}

export function WrapInput(props: WrapInputProps) {
	if (!props.def) {
		throw new Error("no props.def");
	}
	let label = props.def.label;
	if (props.def.required) {
		label += " *";
	}
	return (
		<div title={props.def.tooltip} className="dts-form-component">
			<Field label={label}>
				{props.child}
				<FieldErrors2 errors={props.errors} />
				{props.def.description && <p>{props.def.description}</p>}
			</Field>
		</div>
	);
}

export interface WrapInputBasicProps {
	label: string;
	child: React.ReactNode;
}

export function WrapInputBasic(props: WrapInputBasicProps) {
	return (
		<div className="dts-form-component">
			<Field label={props.label}>{props.child}</Field>
		</div>
	);
}

export interface InputProps {
	ctx: ViewContext;
	user?: UserForFrontend;
	def: FormInputDefSpecific;
	name: string;
	value: any;
	errors: string[] | undefined;
	enumData?: readonly EnumEntry[];
	onChange?: (e: any) => void;
	disabled?: boolean;
}

let notifiedDateFormatErrorOnce = false;

export function Input(props: InputProps) {
	let ctx = props.ctx;

	let wrapInput = function (child: React.ReactNode, label?: string) {
		let def = { ...props.def };
		if (label) {
			def.label = label;
		}
		return <WrapInput def={def} child={child} errors={props.errors} />;
	};
	switch (props.def.type) {
		default:
			throw new Error(
				`Unknown type ${props.def.type} for field ${props.def.key}`
			);
		case "approval_status": {
			if (!props.user) {
				throw new Error("userRole is required when using approvalStatus field");
			}
			if (props.user.role == "data-validator" || props.user.role == "admin") {
				let vs = props.value as string;
				return wrapInput(
					<>
						<select
							required={props.def.required}
							name={props.name}
							defaultValue={vs}
							onChange={props.onChange}
							disabled={props.disabled}
						>
							{props.enumData!.map((v) => (
								<option key={v.key} value={v.key}>
									{v.label}
								</option>
							))}
						</select>
						{props.disabled && (
							<input type="hidden" name={props.name} value="" />
						)}
					</>
				);
			}
			else if (props.user.role == "data-collector") {
				let vs = props.value as string;
				return wrapInput(
					<>
						<input
							type="text"
							defaultValue={props.enumData!.find((v) => v.key == vs)!.label}
							disabled={true}
						></input>
						<input type="hidden" name={props.name} value={vs} />
					</>
				);
			}
			let vs = props.value as string;
			if (vs == "published") {
				return wrapInput(
					<>
						<input
							type="text"
							defaultValue={props.enumData!.find((v) => v.key == vs)!.label}
							disabled={true}
						></input>
						{props.disabled && (
							<input type="hidden" name={props.name} value="" />
						)}
					</>
				);
			}
			return wrapInput(
				<>
					<select
						required={props.def.required}
						name={props.name}
						defaultValue={vs}
						onChange={props.onChange}
						disabled={props.disabled}
					>
						{props
							.enumData!.filter((v) => v.key != "published")
							.map((v) => (
								<option key={v.key} value={v.key}>
									{v.label}
								</option>
							))}
					</select>
					{props.disabled && <input type="hidden" name={props.name} value="" />}
				</>
			);
		}
		case "enum": {
			let vs = props.value as string;
			return wrapInput(
				<>
					<select
						required={props.def.required}
						name={props.name}
						defaultValue={vs}
						onChange={props.onChange}
						disabled={props.disabled}
					>
						{props.enumData!.map((v) => (
							<option key={v.key} value={v.key}>
								{v.label}
							</option>
						))}
					</select>
					{props.disabled && <input type="hidden" name={props.name} value="" />}
				</>
			);
		}
		case "enum-flex": {
			let vs = props.value as string;
			let contains = props.enumData!.some((e) => e.key == vs);
			return wrapInput(
				<select
					required={props.def.required}
					name={props.name}
					defaultValue={vs}
					onChange={props.onChange}
				>
					{!contains && vs && (
						<option key={vs} value={vs}>
							{vs}
						</option>
					)}
					{props.enumData!.map((v) => (
						<option key={v.key} value={v.key}>
							{v.label}
						</option>
					))}
				</select>
			);
		}
		case "bool":
			let v = props.value as boolean;
			if (v) {
				return wrapInput(
					<>
						<input type="hidden" name={props.name} value="off" />
						<input
							type="checkbox"
							name={props.name}
							defaultChecked
							onChange={props.onChange}
						/>
					</>
				);
			} else {
				return wrapInput(
					<>
						<input type="hidden" name={props.name} value="off" />
						<input
							type="checkbox"
							name={props.name}
							onChange={props.onChange}
						/>
					</>
				);
			}
		case "textarea": {
			let defaultValueTextArea = "";
			if (props.value !== null && props.value !== undefined) {
				let v = props.value as string;
				defaultValueTextArea = v;
			}
			return wrapInput(
				<textarea
					required={props.def.required}
					name={props.name}
					defaultValue={defaultValueTextArea}
					onChange={props.onChange}
				/>
			);
		}
		case "json": {
			let defaultValueTextArea = "";
			if (props.value !== null && props.value !== undefined) {
				let v = JSON.stringify(props.value);
				defaultValueTextArea = v;
			}
			return wrapInput(
				<textarea
					required={props.def.required}
					name={props.name}
					defaultValue={defaultValueTextArea}
					onChange={props.onChange}
				/>
			);
		}
		case "date_optional_precision": {
			let vsInit = (props.value || "") as string;
			let precisionInit: "yyyy-mm-dd" | "yyyy-mm" | "yyyy" = "yyyy-mm-dd";
			// yyyy-mm-dd
			let vsFullInit: { y: number; m: number; d: number } = {
				y: 0,
				m: 0,
				d: 0,
			};
			if (vsInit) {
				if (vsInit.length == 10) {
					vsFullInit = {
						y: Number(vsInit.slice(0, 4)),
						m: Number(vsInit.slice(5, 7)),
						d: Number(vsInit.slice(8)),
					};
				} else if (vsInit.length == 7) {
					vsFullInit = {
						y: Number(vsInit.slice(0, 4)),
						m: Number(vsInit.slice(5)),
						d: 1,
					};
					precisionInit = "yyyy-mm";
				} else if (vsInit.length == 4) {
					vsFullInit = { y: Number(vsInit), m: 1, d: 1 };
					precisionInit = "yyyy";
				} else {
					if (!notifiedDateFormatErrorOnce) {
						notifiedDateFormatErrorOnce = true;
						notifyError(
							`Invalid date format in database. Removing value for field ${props.def.label}. Got date: ${vsInit}`
						);
					}
				}
			}
			let toDB = (
				vs: { y: number; m: number; d: number },
				prec: "yyyy-mm-dd" | "yyyy-mm" | "yyyy"
			): string => {
				if (prec == "yyyy") {
					if (!vs.y) return "";
					return String(vs.y);
				} else if (prec == "yyyy-mm") {
					if (!vs.y || !vs.m) return "";
					return vs.y + "-" + String(vs.m).padStart(2, "0");
				}
				if (!vs.y || !vs.m || !vs.d) return "";
				return (
					vs.y +
					"-" +
					String(vs.m).padStart(2, "0") +
					"-" +
					String(vs.d).padStart(2, "0")
				);
			};
			let [vsDB, vsDBSet] = useState(vsInit);
			let [vsFull, vsFullSet] = useState(vsFullInit);
			let [precision, precisionSet] = useState(precisionInit);
			let vsDBSet2 = (v: string) => {
				console.log("setting date in db format", v);
				vsDBSet(v);
			};

			return (
				<div>
					<WrapInputBasic
						label={props.def.label + " " + ctx.t({ "code": "common.format", "msg": "Format" })}
						child={
							<select
								value={precision}
								onChange={(e: any) => {
									let p = e.target.value;
									precisionSet(p);
									vsDBSet(toDB(vsFull, p));
									if (props.onChange) props.onChange(e);
								}}
							>
								<option value="yyyy-mm-dd">
									{ctx.t({
										"code": "common.date_format_full_date",
										"msg": "Full date"
									})}
								</option>
								<option value="yyyy-mm">
									{ctx.t({
										"code": "common.date_format_year_month",
										"msg": "Year and month"
									})}
								</option>
								<option value="yyyy">
									{ctx.t({
										"code": "common.date_format_year_only",
										"msg": "Year only"
									})}
								</option>
							</select>
						}
					/>
					<input type="hidden" name={props.name} value={vsDB} />
					{precision == "yyyy-mm-dd" &&
						wrapInput(
							<input
								required={props.def.required}
								type="date"
								value={
									vsFull.y +
									"-" +
									String(vsFull.m).padStart(2, "0") +
									"-" +
									String(vsFull.d).padStart(2, "0")
								}
								onChange={(e: any) => {
									let vStr = e.target.value;
									let v = { y: 0, m: 0, d: 0 };
									if (vStr.length >= "yyyy-mm-dd".length) {
										let dateParts = vStr.split("-");
										v = {
											y: Number(dateParts[0]),
											m: Number(dateParts[1]),
											d: Number(dateParts[2]),
										};
									}
									vsFullSet(v);
									vsDBSet2(toDB(v, precision));
									if (props.onChange) props.onChange(e);
								}}
							/>,
							props.def.label + " " + ctx.t({ "code": "common.date", "msg": "Date" })
						)}
					{precision == "yyyy-mm" && (
						<>
							{wrapInput(
								<input
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value;
										if (!/^\d{4}$/.test(vStr)) {
											notifyError(ctx.t({ "code": "common.invalid_year_format", "msg": "Invalid year format, must be YYYY." }));
											return;
										}
										let v = { y: Number(vStr), m: vsFull.m, d: 0 };
										vsFullSet(v);
										vsDBSet2(toDB(v, precision));
										if (props.onChange) props.onChange(e);
									}}
								/>,
								props.def.label + " " + ctx.t({ "code": "common.year", "msg": "Year" })
							)}
							<WrapInputBasic
								label={props.def.label + " " + ctx.t({ "code": "common.month", "msg": "Month" })}
								child={
									<select
										value={vsFull.m || ""}
										onChange={(e: any) => {
											let v = { y: vsFull.y, m: Number(e.target.value), d: 0 };
											vsFullSet(v);
											vsDBSet2(toDB(v, precision));
											if (props.onChange) props.onChange(e);
										}}
									>
										<option key="" value="">
											{ctx.t({ "code": "common.select", "msg": "Select" })}
										</option>
										{Array.from({ length: 12 }, (_, i) => (
											<option key={i} value={i + 1}>
												{getMonthName(ctx, i + 1)}
											</option>
										))}
									</select>
								}
							/>
						</>
					)}
					{precision == "yyyy" && (
						<>
							{wrapInput(
								<input
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value;
										if (!/^\d{4}$/.test(vStr)) {
											notifyError(ctx.t({ "code": "common.invalid_year_format", "msg": "Invalid year format, must be YYYY." }));
											return;
										}
										let v = { y: Number(vStr), m: vsFull.m, d: 0 };
										vsFullSet(v);
										vsDBSet2(toDB(v, precision));
										if (props.onChange) props.onChange(e);
									}}
								/>,
								props.def.label + " " + ctx.t({ "code": "common.year", "msg": "Year" })
							)}
						</>
					)}
				</div>
			);
		}
		case "text":
		case "date":
		case "datetime":
		case "number":
		case "money":
		case "uuid":
			let defaultValue = "";
			if (props.value !== null && props.value !== undefined) {
				switch (props.def.type) {
					case "text": {
						let v = props.value as string;
						defaultValue = v;
						break;
					}
					case "date": {
						let v = props.value as Date;
						defaultValue = formatDate(v);
						break;
					}
					case "datetime": {
						let v = props.value as Date;
						defaultValue = formatForDateTimeInput(v);
						break;
					}
					case "number": {
						let v = props.value as number;
						defaultValue = String(v);
						break;
					}
					case "money": {
						let v = props.value as string;
						defaultValue = v;
						break;
					}
					default:
						throw new Error("unknown type: " + props.def.type);
				}
			}
			let inputType = "";
			switch (props.def.type) {
				case "text":
				case "date":
					inputType = props.def.type;
					break;
				case "datetime":
					inputType = "datetime-local";
					break;
				case "number":
					return wrapInput(
						<input
							required={props.def.required}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							name={props.name}
							defaultValue={defaultValue}
							onChange={props.onChange}
						/>
					);
				case "money":
					return wrapInput(
						<input
							required={props.def.required}
							type="text"
							inputMode="decimal"
							pattern="[0-9]*\.?[0-9]*"
							name={props.name}
							defaultValue={defaultValue}
							onChange={props.onChange}
						/>
					);
			}
			if (inputType == "") {
				throw new Error("inputType is empty");
			}
			return wrapInput(
				<input
					required={props.def.required}
					type={inputType}
					name={props.name}
					defaultValue={defaultValue}
					onChange={props.onChange}
				/>
			);
		case "table_uuid":
			let vs = props.value as string;
			return wrapInput(<>
				<textarea
					style={{
						display: "none"
					}}
					id={props.name}
					required={props.def.required}
					name={props.name}
					defaultValue={vs}
					onChange={props.onChange}
				/>
			</>);

	}
}

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

	if (props.value === null || props.value === undefined) {
		return <p>{props.def.label}: -</p>;
	}
	switch (props.def.type) {
		default:
			throw new Error(
				`Unknown type ${props.def.type} for field ${props.def.key}`
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
					`invalid data for field ${props.def.key}, not a string, got: ${props.value}`
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

interface FormScreenProps<T> {
	loaderData: { item: T | null; }
	ctx: ViewContext;
	formComponent: any;
	extraData?: any;
}

export function FormScreen<T>(props: FormScreenProps<T>) {
	const fieldsInitial = props.loaderData.item ? props.loaderData.item : {};

	return formScreen({
		ctx: props.ctx,
		extraData: props.extraData || {},
		fieldsInitial,
		form: props.formComponent,
		edit: !!props.loaderData.item,
		id: (props.loaderData.item as any)?.id || null,
	});
}

interface ViewScreenPublicApprovedProps<T> {
	loaderData: {
		item: T;
		isPublic: boolean;
		auditLogs?: any[];
	}
	ctx: ViewContext;
	viewComponent: React.ComponentType<{
		ctx: ViewContext;
		item: T;
		isPublic: boolean;
		auditLogs?: any[];
	}>;
}

export function ViewScreenPublicApproved<T>(
	props: ViewScreenPublicApprovedProps<T>
) {
	let ViewComponent = props.viewComponent;
	const ld = props.loaderData
	if (!ld.item) {
		throw "invalid";
	}
	if (ld.isPublic === undefined) {
		throw "loader does not expose isPublic";
	}
	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={ld.isPublic}
			item={ld.item}
			auditLogs={ld.auditLogs}
		/>
	);
}

interface ViewComponentProps {
	ctx: ViewContext;
	isPublic?: boolean;
	path: string;
	listUrl?: string;
	id: any;
	title: string;
	extraActions?: React.ReactNode;
	extraInfo?: React.ReactNode;
	children?: React.ReactNode;
	approvalStatus?: approvalStatusIds;
}

export function ViewComponentMainDataCollection(props: ViewComponentProps) {
	const ctx = props.ctx
	const [selectedAction, setSelectedAction] = useState<string>("submit-validate");
	const [visibleModalSubmit, setVisibleModalSubmit] = useState<boolean>(false);
	const [checked, setChecked] = useState(false);

	const btnRefSubmit = useRef(null);
	const actionLabels: Record<string, string> = {
		"submit-validate": "Validate record",
		"submit-publish": "Validate and publish record",
		"submit-reject": "Return record",
	};
	const [textAreaText, setText] = useState("");
	const textAreaMaxLength = 500;
	const fetcher = useFetcher<{ ok: boolean, message: string }>();
	const formRef = useRef<HTMLFormElement>(null);

	// Modal submit validation function
	function validateBeforeSubmit(selectedAction: string): boolean {
		const formTextAreaReject = document.getElementById('reject-comments-textarea') as HTMLTextAreaElement | null;
		const formTextAreaRejectValue = formTextAreaReject?.value.toString().trim() || "";

		const formData = new FormData();
		formData.append("action", selectedAction);
		formData.append("id", props.id);
		formData.append("rejection-comments", formTextAreaRejectValue);

		// Client-side validation only for submit-reject action
		if (!formTextAreaRejectValue && selectedAction === 'submit-reject') {
			alert("Provide comments for changes needed for this record");
			return false;
		}

		// Programmatically submit via fetcher
		fetcher.submit(formData, { method: "post" });

		return false;
	}

	return (<>
		<fetcher.Form method="post" ref={formRef}>
			<div className="card flex justify-content-center">
				<Dialog visible={visibleModalSubmit} modal header="Validate or Return"
					style={{ width: '50rem' }}
					onHide={() => { if (!visibleModalSubmit) return; setVisibleModalSubmit(false); }}
				>
					<div>
						<p>Select an option below to either validate or reject the data record. Once selected, the status of the record will be updated in the list.</p>
					</div>

					<div>
						<ul className="dts-attachments">
							<li className="dts-attachments__item" style={{ justifyContent: "left" }}>
								<div className="dts-form-component">
									<label>
										<div className="dts-form-component__field--horizontal">
											<input
												id="radiobuttonValidateReturn-validate"
												type="radio"
												name="radiobuttonValidateReturn"
												value="submit-validate"
												aria-controls="linkAttachment"
												aria-expanded="false"
												checked={selectedAction === 'submit-validate' || selectedAction === 'submit-publish'}
												onChange={() => {
													setSelectedAction('submit-validate');
												}}
											/>
										</div>
									</label>
								</div>
								<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
									<span>Validate</span>
									<span style={{ color: "#999" }}>This indicates that the event has been checked for accuracy.</span>

									<div style={{ display: "block" }}>
										<div style={{ width: "40px", marginTop: "10px", float: "left" }}>
											<Checkbox
												id="publish-checkbox"
												name="publish-checkbox"
												value="submit-publish"
												onChange={e => {
													if (e.checked === undefined) return;
													else if (!e.checked) {
														setSelectedAction('submit-validate');
														setChecked(false);
													}
													else {
														setChecked(true);
														setSelectedAction('submit-publish');
													}

												}}
												checked={checked}></Checkbox>
										</div>
										<div style={{ marginLeft: "20px", marginTop: "10px" }}>
											<div>Publish to UNDRR instance</div>

											<span style={{ color: "#999" }}>Data from this event will be made publicly available.</span>
										</div>
									</div>
								</div>
							</li>
							<li className="dts-attachments__item" style={{ justifyContent: "left" }}>
								<div className="dts-form-component">
									<label>
										<div className="dts-form-component__field--horizontal">
											<input
												id="radiobuttonValidateReturn-reject"
												type="radio"
												name="radiobuttonValidateReturn"
												value="submit-reject"
												aria-controls="linkAttachment"
												aria-expanded="false"
												checked={selectedAction === 'submit-reject'}
												onChange={() => {
													setChecked(false);
													setSelectedAction('submit-reject');
												}}
											/>
										</div>
									</label>
								</div>
								<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
									<span>Return with comments</span>
									<span style={{ color: "#999" }}>This event will be returned to the submitter to make changes and re-submit for approval.</span>
									<textarea
										required={true}
										id="reject-comments-textarea"
										name="reject-comments-textarea"
										disabled={
											selectedAction !== '' &&
											selectedAction !== 'submit-reject'
										}
										value={textAreaText}
										onChange={(e) => setText(e.target.value)}
										maxLength={textAreaMaxLength}
										style={{ width: "100%", minHeight: "100px" }}
										placeholder="Provide comments for changes needed to this record"></textarea>
									<div style={{ textAlign: "right", color: textAreaText.length > 450 ? "red" : "#000" }}>{textAreaText.length}/{textAreaMaxLength} characters</div>
								</div>
							</li>
							<li>
								<div>
									<Button
										ref={btnRefSubmit}
										className="mg-button mg-button-primary"
										label={actionLabels[selectedAction] || "Submit for validation"}
										style={{ width: "100%" }}
										onClick={() => {
											if (validateBeforeSubmit(selectedAction)) {
												setVisibleModalSubmit(false);
											}
										}}
									/>
									<div>
										{fetcher.data && (
											<p>
												{JSON.stringify(
													fetcher.data.message
												)}
											</p>
										)}
									</div>
								</div>
							</li>

						</ul>
					</div>
				</Dialog>
			</div>
		</fetcher.Form>
		<MainContainer title={props.title}>
			<><form className="dts-form">
				<p>
					<LangLink lang={ctx.lang} to={props.listUrl || props.path}>{props.title}</LangLink>
				</p>
				{!props.isPublic && (
					<>
						<div style={{ textAlign: "right" }}>
							<LangLink
								lang={ctx.lang}
								to={`${props.path}/edit/${String(props.id)}`}
								className="mg-button mg-button-secondary"
								style={{ margin: "5px" }}
							>
								{ctx.t({
									"code": "common.edit",
									"msg": "Edit"
								})}
							</LangLink>

							{props.approvalStatus === "waiting-for-validation" && (<>
								<Button
									lang={ctx.lang}
									className="mg-button mg-button-primary"
									style={{
										margin: "5px",
										display: "none"
									}}
									onClick={(e: any) => {
										e.preventDefault();
										setVisibleModalSubmit(true);
									}}
								>
									{ctx.t({
										"code": "common.validate_or_return",
										"msg": "Validate or Return"
									})}
								</Button>
							</>)}
							{props.extraActions}
						</div>

					</>
				)}
				<h2>{props.title}</h2>
				<p>{ctx.t({
					"code": "common.id",
					"msg": "ID"
				})}: {String(props.id)}
				</p>
				{props.extraInfo}
				{props.children}
			</form></>
		</MainContainer>
	</>);
}

export function ViewComponent(props: ViewComponentProps) {
	const ctx = props.ctx
	return (
		<MainContainer title={props.title}>
			<><form className="dts-form">
				<p>
					<LangLink lang={ctx.lang} to={props.listUrl || props.path}>{props.title}</LangLink>
				</p>
				{!props.isPublic && (
					<>
						<div>
							<LangLink
								lang={ctx.lang}
								to={`${props.path}/edit/${String(props.id)}`}
								className="mg-button mg-button-secondary"
								style={{ margin: "5px" }}
							>
								{ctx.t({
									"code": "common.edit",
									"msg": "Edit"
								})}
							</LangLink>
							<DeleteButton
								useIcon={true}
								action={ctx.url(`${props.path}/delete/${String(props.id)}`)}
							/>
						</div>
						{props.extraActions}
					</>
				)}
				<h2>{props.title}</h2>
				<p>{ctx.t({
					"code": "common.id",
					"msg": "ID"
				})}: {String(props.id)}
				</p>
				{props.extraInfo}
				{props.children}
			</form></>
		</MainContainer>
	);
}

interface FormViewProps {
	ctx: ViewContext;

	path: string;
	listUrl?: string;
	viewUrl?: string;
	edit: boolean;
	id?: any;
	infoNodes?: React.ReactNode;
	errors: any;
	fields: any;
	fieldsDef: any;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>;
	formRef?: React.Ref<HTMLFormElement>;
	user?: UserForFrontend;

	// 2025-11-25 old field that were not translated
	plural?: string;
	singular?: string;

	// 2025-11-25 new fields that are translated
	title?: string;
	editLabel?: string;
	addLabel?: string;

	overrideSubmitMainForm?: React.ReactElement;
}

export function FormView(props: FormViewProps) {
	if (!props.fieldsDef) {
		throw new Error("props.fieldsDef not passed to FormView");
	}
	if (!Array.isArray(props.fieldsDef)) {
		console.log("props.fieldsDef", props.fieldsDef)
		throw new Error("props.fieldsDef must be an array");
	}
	let ctx = props.ctx;
	const title = props.title || capitalizeFirstLetter(props.plural || "")

	let inputsRef = useRef<HTMLDivElement>(null);
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";
	let [intClickedCtr, setIntClickedCtr] = useState(0);

	useEffect(() => {
		const formElement = document.querySelector<HTMLFormElement>(".dts-form");
		const formElementSubmit = document.querySelector<HTMLButtonElement>(
			"#form-default-submit-button"
		);
		let opts = { inputsRef, defs: props.fieldsDef };
		repeatablefields.attach(opts);

		const handleSubmit = () => {
			if (formElementSubmit) {
				formElementSubmit.setAttribute("disabled", "true");

				// Call the function after 2 seconds, then remove the disabled attribute
				setTimeout(() => {
					formElementSubmit.removeAttribute("disabled");
					intClickedCtr++;
					setIntClickedCtr(intClickedCtr);
				}, 2000);
			}
		};

		return () => {
			if (formElement) {
				formElement.removeEventListener("submit", handleSubmit);
			}
		};
	}, [intClickedCtr, isSubmitting]);

	return (
		<MainContainer title={title}>
			<>
				<section className="dts-page-section">
					<p>
						<LangLink lang={ctx.lang} to={props.listUrl || props.path}>{title}</LangLink>
					</p>
					{props.edit && props.id && (
						<p>
							<LangLink lang={ctx.lang} to={props.viewUrl || `${props.path}/${props.id}`}>
								{ctx.t({
									"code": "common.view",
									"msg": "View"
								})}
							</LangLink>
						</p>
					)}
					<h2>
						{props.edit
							? (props.editLabel || "Edit " + props.singular)
							: (props.addLabel || "Add " + props.singular)
						}
					</h2>
					{props.edit && props.id && (
						<p>
							{ctx.t({
								"code": "common.id",
								"msg": "ID"
							})}: {String(props.id)}
						</p>
					)}
					{props.infoNodes}
				</section>

				<Form
					ctx={props.ctx}
					formRef={props.formRef}
					errors={props.errors}
					className="dts-form"
				>
					<div ref={inputsRef}>
						<Inputs
							key={props.id}
							ctx={ctx}
							user={props.user}
							def={props.fieldsDef}
							fields={props.fields}
							errors={props.errors}
							override={props.override}
							elementsAfter={props.elementsAfter}
							id={props.id}
						/>
					</div>
					<div className="dts-form__actions">
						<SubmitButton
							id="form-default-submit-button"
							disabled={isSubmitting}
							label={ctx.t({
								"code": "common.save",
								"msg": "Save"
							})}
						/>

						{
							props.overrideSubmitMainForm ? (
								props.overrideSubmitMainForm
							) : (
								<>
									{/* <SubmitButton
									id="form-default-submit-button"
									disabled={isSubmitting}
									label={ctx.t({
										"code": "common.save",
										"msg": "Save"
									})}
								/> */}
								</>
							)
						}

					</div>
				</Form>
			</>
		</MainContainer>
	);
}

interface ActionLinksProps {
	ctx: ViewContext;
	route: string;
	id: string | number;
	deleteMessage?: string;
	deleteTitle?: string;
	confirmDeleteLabel?: string;
	cancelDeleteLabel?: string;
	hideViewButton?: boolean;
	hideEditButton?: boolean;
	hideDeleteButton?: boolean;
	user?: any;
	approvalStatus?: string | undefined;
}

export function ActionLinks(props: ActionLinksProps) {
	const ctx = props.ctx;
	return (
		<div style={{ display: "flex", justifyContent: "space-evenly" }}>
			{!props.hideEditButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/edit/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label="Edit"
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/edit.svg#edit" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideViewButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label="View"
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideDeleteButton && canDelete(props.approvalStatus, ctx.user) && (
				<DeleteButton
					key={props.id}
					action={ctx.url(`${props.route}/delete/${props.id}`)}
					useIcon
					confirmMessage={props.deleteMessage}
					title={props.deleteTitle}
					confirmLabel={props.confirmDeleteLabel}
					cancelLabel={props.cancelDeleteLabel}
					confirmIcon={
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/trash-alt.svg#delete" />
						</svg>
					}
					confirmButtonFirst={false}
				/>
			)}
		</div>
	);
}

/**
 * Determines if a user can delete
 * Based on business rules:
 * - Data-viewers cannot delete any records
 * - Records that are Published or Validated by someone else cannot be deleted
 */
function canDelete(approvalStatus: string | undefined, user: any): boolean {
	if (!user) return false;

	// Data-viewers cannot delete any records
	if (user.role === "data-viewer") return false;

	// Published or validated records cannot be deleted
	return approvalStatus?.toLowerCase() !== "published" && approvalStatus?.toLowerCase() !== "validated";
}

/**
 * Disables the submit button of a form until all required fields are valid.
 *
 * @param formId - The ID of the form element to validate.
 * @param submitButtonId - The ID of the submit button element to disable/enable.
 */
export const validateFormAndToggleSubmitButton = (
	formId: string,
	submitButtonId: string
): void => {
	// Select the form element using the provided ID
	const formElement = document.querySelector<HTMLFormElement>(`#${formId}`);

	// Select the submit button element using the provided ID
	const submitButton = document.querySelector<HTMLButtonElement>(
		`#${submitButtonId}`
	);

	// Check if the form and submit button elements are found
	if (formElement && submitButton) {
		// Select all input fields with the 'required' attribute within the form
		const requiredFields =
			formElement.querySelectorAll<HTMLInputElement>("input[required]");

		if (requiredFields.length > 0) {
			// Iterate over each required field and add an event listener to validate inputs
			requiredFields.forEach((field) => {
				field.addEventListener("input", () => {
					// Check if all required fields are valid
					const allFieldsValid = Array.from(requiredFields).every(
						(requiredField) => requiredField.validity.valid
					);

					// Enable the submit button if all fields are valid, otherwise disable it
					submitButton.disabled = !allFieldsValid;
				});
			});
		}
	} else {
		console.error(
			"Form or submit button not found. Ensure the provided IDs are correct."
		);
	}
};
