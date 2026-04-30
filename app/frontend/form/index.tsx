// Import types from types.ts
import {
	type FormInputType,
	type EnumEntry,
	type UIRow,
	type FormInputDef,
	type FormInputDefSpecific,
} from "./types";

export type { FormInputType, EnumEntry, UIRow, FormInputDef, FormInputDefSpecific };

export { splitDefsIntoRows } from "./types";
export { rowMeta } from "./row_meta";

export { SubmitButton } from "./submit";

export {
	FieldsView,
	FieldView,
	FormScreen,
	ViewScreenPublicApproved,
	ViewComponentMainDataCollection,
	ViewComponent,
	FormView,
	ActionLinks,
} from "./view";
export type { ViewPropsBase } from "./view";

// Export from form_components.tsx
export {
	Form,
	formScreen,
	FormMessage,
	Field,
	FieldErrors,
	FieldErrors2,
	FieldErrors3,
	errorToString,
	errorsToCodes,
	errorsToStrings,
	initErrorField,
	firstError,
	hasErrors,
} from "./form_components";
export type {
	FormResponse,
	FormResponse2,
	FormError,
	Errors,
	UserFormProps,
	FormScreenOpts,
} from "./form_components";

// Export from input.tsx
export { Input, WrapInput, WrapInputBasic } from "./input";
export type { InputProps, WrapInputProps, WrapInputBasicProps } from "./input";

// Export from inputs.tsx
export { Inputs } from "./inputs";
export type { InputsProps } from "./inputs";