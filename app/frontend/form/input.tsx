import { useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { formatDate, formatForDateTimeInput, getMonthName } from "~/utils/date";
import { ViewContext } from "../context";
import { UserForFrontend } from "~/utils/auth";
import { type FormInputDefSpecific, type EnumEntry } from "./types";
import { Field, FieldErrors2 } from "./form_components";

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


