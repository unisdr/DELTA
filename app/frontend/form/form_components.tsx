// Form components - separated to break circular dependency with view.tsx
import { Form as ReactForm } from "react-router";
import { useActionData } from "react-router";
import React from "react";

import { UserForFrontend } from "~/utils/auth";
import { ViewContext } from "../context";
import { CommonData } from "~/backend.server/handlers/commondata";

// Import types from types.ts
import { type FormInputDef, type FormInputDefSpecific } from "./types";

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


