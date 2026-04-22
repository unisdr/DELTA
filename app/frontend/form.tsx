import { Form as ReactForm } from "react-router";

import { useActionData } from "react-router";
import { ReactElement, useRef, useState } from "react";

import {
	formatDate,
	formatForDateTimeInput,
	getMonthName,
} from "~/utils/date";

import React from "react";

import { UserForFrontend } from "~/utils/auth";

import { ViewContext } from "./context";
import { CommonData } from "~/backend.server/handlers/commondata";
import { Toast } from "primereact/toast";

// Re-export from form-view for backward compatibility
export {
	FieldsView,
	FieldView,
	FormScreen,
	ViewScreenPublicApproved,
	ViewComponentMainDataCollection,
	ViewComponent,
	FormView,
	ActionLinks,
} from "./form_view";
export type { ViewPropsBase } from "./form_view";

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
	errors: (string | FormError)[] | undefined,
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? "unknown_error" : error.code,
	);
}

export function errorsToStrings(
	errors: (string | FormError)[] | undefined,
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? error : error.message,
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
	errors: Errors<T> | undefined,
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
					<h2>{ctx.t({ code: "common.form_errors", msg: "Form errors" })}</h2>
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
	id?: string;
	usersWithValidatorRole?: any; // Add appropriate type here
	extraHiddenFields?: any;
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
		extraHiddenFields: opts.extraHiddenFields,
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

interface rowMeta {
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
	const toast = useRef<Toast>(null);

	const showErrorToast = (detail: string) => {
		toast.current?.show({
			severity: "error",
			detail,
			life: 5000,
		});
	};

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
				`Unknown type ${props.def.type} for field ${props.def.key}`,
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
					</>,
				);
			} else if (props.user.role == "data-collector") {
				let vs = props.value as string;
				return wrapInput(
					<>
						<input
							type="text"
							defaultValue={props.enumData!.find((v) => v.key == vs)!.label}
							disabled={true}
						></input>
						<input type="hidden" name={props.name} value={vs} />
					</>,
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
					</>,
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
				</>,
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
				</>,
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
				</select>,
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
					</>,
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
					</>,
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
				/>,
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
				/>,
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
						showErrorToast(
							`Invalid date format in database. Removing value for field ${props.def.label}. Got date: ${vsInit}`,
						);
					}
				}
			}
			let toDB = (
				vs: { y: number; m: number; d: number },
				prec: "yyyy-mm-dd" | "yyyy-mm" | "yyyy",
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
					<Toast ref={toast} position="top-center" />
					<WrapInputBasic
						label={
							props.def.label +
							" " +
							ctx.t({ code: "common.format", msg: "Format" })
						}
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
										code: "common.date_format_full_date",
										msg: "Full date",
									})}
								</option>
								<option value="yyyy-mm">
									{ctx.t({
										code: "common.date_format_year_month",
										msg: "Year and month",
									})}
								</option>
								<option value="yyyy">
									{ctx.t({
										code: "common.date_format_year_only",
										msg: "Year only",
									})}
								</option>
							</select>
						}
					/>
					<input type="hidden" name={props.name} value={vsDB} />
					{precision == "yyyy-mm-dd" &&
						wrapInput(
							<input
								id={props.def.key}
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
							props.def.label +
							" " +
							ctx.t({ code: "common.date", msg: "Date" }),
						)}
					{precision == "yyyy-mm" && (
						<>
							{wrapInput(
								<input
									id={props.def.key}
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value;
										if (!/^\d{4}$/.test(vStr)) {
											showErrorToast(
												ctx.t({
													code: "common.invalid_year_format",
													msg: "Invalid year format, must be YYYY.",
												}),
											);
											return;
										}
										let v = { y: Number(vStr), m: vsFull.m, d: 0 };
										vsFullSet(v);
										vsDBSet2(toDB(v, precision));
										if (props.onChange) props.onChange(e);
									}}
								/>,
								props.def.label +
								" " +
								ctx.t({ code: "common.year", msg: "Year" }),
							)}
							<WrapInputBasic
								label={
									props.def.label +
									" " +
									ctx.t({ code: "common.month", msg: "Month" })
								}
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
											{ctx.t({ code: "common.select", msg: "Select" })}
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
									id={props.def.key}
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value;
										if (!/^\d{4}$/.test(vStr)) {
											showErrorToast(
												ctx.t({
													code: "common.invalid_year_format",
													msg: "Invalid year format, must be YYYY.",
												}),
											);
											return;
										}
										let v = { y: Number(vStr), m: vsFull.m, d: 0 };
										vsFullSet(v);
										vsDBSet2(toDB(v, precision));
										if (props.onChange) props.onChange(e);
									}}
								/>,
								props.def.label +
								" " +
								ctx.t({ code: "common.year", msg: "Year" }),
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
						/>,
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
						/>,
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
				/>,
			);
		case "temp_hidden": {
			let vs = props.value as string;
			return wrapInput(
				<>
					<input
						// type="text"
						type="hidden"
						id={props.name}
						required={props.def.required}
						name={props.name}
						defaultValue={vs}
					/>
				</>,
			);
		}
	}
}

