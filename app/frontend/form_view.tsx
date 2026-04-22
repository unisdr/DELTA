import { useState, useEffect, useRef, ReactElement } from "react";
import React from "react";
import { useFetcher, useNavigation } from "react-router";
import {
	formatDate,
	formatDateTimeUTC,
} from "~/utils/date";
import { MainContainer } from "./container";
import * as repeatablefields from "~/frontend/components/repeatablefields";
import { UserForFrontend } from "~/utils/auth";
import { JsonView, allExpanded, defaultStyles } from "react-json-view-lite";
import { DeleteButton } from "./components/delete-dialog";
import { ViewContext } from "./context";
import { LangLink } from "~/utils/link";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Checkbox } from "primereact/checkbox";
import {
	approvalStatusIds,
	approvalStatusKeyToLabel,
} from "~/frontend/approval";
import { canEditRecord } from "./user/roles";
import {
	type FormInputDef,
	type FormInputDefSpecific,
	Form,
	Inputs,
	SubmitButton,
	formScreen,
	splitDefsIntoRows,
	rowMeta,
} from "./form";

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

interface FormScreenProps<T> {
	loaderData: { item: T | null };
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
	};
	ctx: ViewContext;
	viewComponent: React.ComponentType<{
		ctx: ViewContext;
		item: T;
		isPublic: boolean;
		auditLogs?: any[];
	}>;
}

export function ViewScreenPublicApproved<T>(
	props: ViewScreenPublicApprovedProps<T>,
) {
	let ViewComponent = props.viewComponent;
	const ld = props.loaderData;
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

interface ViewComponentMainDataCollectionProps {
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
	recordTitle?: string;
	recordDate?: string;
	recordRecipient?: string;
}

export function ViewComponentMainDataCollection(
	props: ViewComponentMainDataCollectionProps,
) {
	const ctx = props.ctx;
	const [selectedAction, setSelectedAction] =
		useState<string>("submit-validate");
	const [visibleModalSubmit, setVisibleModalSubmit] = useState<boolean>(false);
	const [checked, setChecked] = useState(false);

	const btnRefSubmit = useRef(null);
	const actionLabels: Record<string, string> = {
		"submit-validate": ctx.t({
			code: "common.validate_record",
			msg: "Validate record",
		}),
		"submit-publish": ctx.t({
			code: "common.validate_and_publish_record",
			msg: "Validate and publish record",
		}),
		"submit-reject": ctx.t({
			code: "common.return_record",
			msg: "Return record",
		}),
	};
	const [textAreaText, setText] = useState("");
	const textAreaMaxLength = 500;
	const fetcher = useFetcher<{ ok: boolean; message: string }>();
	const [visibleModalConfirmation, setVisibleModalConfirmation] =
		useState<boolean>(false);
	const formRef = useRef<HTMLFormElement>(null);

	// Modal submit validation function
	function validateBeforeSubmit(selectedAction: string): boolean {
		const formTextAreaReject = document.getElementById(
			"reject-comments-textarea",
		) as HTMLTextAreaElement | null;
		const formTextAreaRejectValue =
			formTextAreaReject?.value.toString().trim() || "";

		const formData = new FormData();
		formData.append("action", selectedAction);
		formData.append("id", props.id);
		formData.append("rejection-comments", formTextAreaRejectValue);

		// Client-side validation only for submit-reject action
		if (!formTextAreaRejectValue && selectedAction === "submit-reject") {
			alert("Provide comments for changes needed for this record");
			return false;
		}

		// Programmatically submit via fetcher
		fetcher.submit(formData, { method: "post" });

		return false;
	}

	// React to fetcher response
	useEffect(() => {
		if (fetcher.state === "idle" && fetcher.data) {
			if (fetcher.data.ok) {
				// Perform success action
				console.log("Success:", fetcher.data.message);
				setVisibleModalSubmit(false);
				setVisibleModalConfirmation(true);
			} else {
				// Perform failure action
				console.error("Error:", fetcher.data.message);
				alert("Something went wrong.");
			}
		}
	}, [fetcher.state, fetcher.data]);

	return (
		<>
			<fetcher.Form method="post" ref={formRef}>
				<div className="card flex justify-content-center">
					<Dialog
						visible={visibleModalConfirmation}
						modal={true}
						header={
							selectedAction === "submit-reject"
								? ctx.t({
									code: "common.returned_with_comments",
									msg: "Returned with comments",
								})
								: ctx.t({
									code: "common.successfully_validated",
									msg: "Successfully validated",
								})
						}
						style={{ width: "50rem" }}
						onHide={() => {
							if (!visibleModalConfirmation) return;
							setVisibleModalConfirmation(false);
						}}
					>
						<div>
							<p>
								{selectedAction === "submit-reject"
									? ctx.t({
										code: "common.returned_to_submitter_for_changes",
										msg: "The event below has been returned to the submitter for changes",
									})
									: ctx.t({
										code: "common.validated_and_ready_to_publish",
										msg: "The event below has been validated and is ready to be published",
									})}
							</p>

							{props.recordTitle && <p>{props.recordTitle}</p>}

							{props.recordDate && <p>{props.recordDate}</p>}

							<p>
								{ctx.t({ code: "common.status", msg: "Status" })}:{" "}
								<span
									className={`dts-status dts-status--${props.approvalStatus}`}
								></span>{" "}
								{props.approvalStatus
									? approvalStatusKeyToLabel(ctx, props.approvalStatus)
									: ""}
							</p>

							{props.recordRecipient && (
								<p>
									{ctx.t({ code: "common.recipient", msg: "Recipient" })}:{" "}
									{props.recordRecipient}
								</p>
							)}
						</div>
						<div>
							<Button
								className="mg-button mg-button-primary"
								label={ctx.t({
									code: "common.view_this_event",
									msg: "View this event",
								})}
								style={{ width: "100%", marginBottom: "10px" }}
								onClick={() => {
									// Close modal to view the event
									setVisibleModalConfirmation(false);
								}}
							/>
							<Button
								className="mg-button mg-button-outline"
								label={ctx.t({
									code: "common.view_all_events",
									msg: "View all events",
								})}
								style={{ width: "100%" }}
								onClick={() => {
									// Navigate to all events page
									document.location.href = ctx.url(props.path);
								}}
							/>
						</div>
					</Dialog>
					<Dialog
						visible={visibleModalSubmit}
						modal
						header={ctx.t({
							code: "common.validate_or_return",
							msg: "Validate or Return",
						})}
						style={{ width: "50rem" }}
						onHide={() => {
							if (!visibleModalSubmit) return;
							setVisibleModalSubmit(false);
						}}
					>
						<div>
							<p>
								{ctx.t({
									code: "common.validate_or_return_instructions",
									msg: "Select an option below to either validate or reject the data record. Once selected, the status of the record will be updated in the list.",
								})}
							</p>
						</div>

						<div>
							<ul className="dts-attachments">
								<li
									className="dts-attachments__item"
									style={{ justifyContent: "left" }}
								>
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
													checked={
														selectedAction === "submit-validate" ||
														selectedAction === "submit-publish"
													}
													onChange={() => {
														setSelectedAction("submit-validate");
													}}
												/>
											</div>
										</label>
									</div>
									<div
										style={{
											justifyContent: "left",
											display: "flex",
											flexDirection: "column",
											gap: "4px",
										}}
									>
										<span>
											{ctx.t({ code: "common.validate", msg: "Validate" })}
										</span>
										<span style={{ color: "#999" }}>
											{ctx.t({
												code: "common.validate_description",
												msg: "This indicates that the event has been checked for accuracy.",
											})}
										</span>

										<div style={{ display: "block" }}>
											<div
												style={{
													width: "40px",
													marginTop: "10px",
													float: "left",
												}}
											>
												<Checkbox
													id="publish-checkbox"
													name="publish-checkbox"
													value="submit-publish"
													onChange={(e) => {
														if (e.checked === undefined) return;
														else if (!e.checked) {
															setSelectedAction("submit-validate");
															setChecked(false);
														} else {
															setChecked(true);
															setSelectedAction("submit-publish");
														}
													}}
													checked={checked}
												></Checkbox>
											</div>
											<div style={{ marginLeft: "20px", marginTop: "10px" }}>
												<div>
													{ctx.t({
														code: "common.publish_undrr_instance",
														msg: "Publish to UNDRR instance",
													})}
												</div>

												<span style={{ color: "#999" }}>
													{ctx.t({
														code: "common.publish_undrr_instance_description",
														msg: "Data from this event will be made publicly available.",
													})}
												</span>
											</div>
										</div>
									</div>
								</li>
								<li
									className="dts-attachments__item"
									style={{ justifyContent: "left" }}
								>
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
													checked={selectedAction === "submit-reject"}
													onChange={() => {
														setChecked(false);
														setSelectedAction("submit-reject");
													}}
												/>
											</div>
										</label>
									</div>
									<div
										style={{
											justifyContent: "left",
											display: "flex",
											flexDirection: "column",
											gap: "10px",
										}}
									>
										<span>
											{ctx.t({
												code: "common.return_with_comments",
												msg: "Return with comments",
											})}
										</span>
										<span style={{ color: "#999" }}>
											{ctx.t({
												code: "common.return_with_comments_description",
												msg: "This event will be returned to the submitter to make changes and re-submit for approval.",
											})}
										</span>
										<textarea
											required={true}
											id="reject-comments-textarea"
											name="reject-comments-textarea"
											disabled={
												selectedAction !== "" &&
												selectedAction !== "submit-reject"
											}
											value={textAreaText}
											onChange={(e) => setText(e.target.value)}
											maxLength={textAreaMaxLength}
											style={{ width: "100%", minHeight: "100px" }}
											placeholder={ctx.t({
												code: "common.provide_comments",
												msg: "Provide comments for changes needed to this record",
											})}
										></textarea>
										<div
											style={{
												textAlign: "right",
												color: textAreaText.length > 450 ? "red" : "#000",
											}}
										>
											{textAreaText.length}/{textAreaMaxLength}
											{ctx.t({ code: "common.characters", msg: "characters" })}
										</div>
									</div>
								</li>
								<li>
									<div>
										<Button
											ref={btnRefSubmit}
											disabled={
												fetcher.state === "submitting" ||
												fetcher.state === "loading" ||
												(selectedAction === "submit-reject" &&
													textAreaText.trim() === "")
											}
											className="mg-button mg-button-primary"
											label={
												actionLabels[selectedAction] ||
												ctx.t({
													code: "common.validate_record",
													msg: "Validate record",
												})
											}
											style={{ width: "100%" }}
											onClick={() => {
												if (validateBeforeSubmit(selectedAction)) {
													setVisibleModalSubmit(false);
												}
											}}
										/>
									</div>
								</li>
							</ul>
						</div>
					</Dialog>
				</div>
			</fetcher.Form>
			<MainContainer title={props.title}>
				<>
					<form className="dts-form">
						<p>
							<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
								{props.title}
							</LangLink>
						</p>
						{!props.isPublic && (
							<>
								<div style={{ textAlign: "right" }}>
									<LangLink
										visible={canEditRecord(ctx.user?.role ?? null)}
										lang={ctx.lang}
										to={`${props.path}/edit/${String(props.id)}`}
										className="mg-button mg-button-secondary"
										style={{ margin: "5px" }}
									>
										{ctx.t({
											code: "common.edit",
											msg: "Edit",
										})}
									</LangLink>

									{props.approvalStatus === "waiting-for-validation" && (
										<>
											<Button
												lang={ctx.lang}
												visible={
													!props.isPublic &&
													(ctx.user?.role === "data-validator" ||
														ctx.user?.role === "admin")
												}
												className="mg-button mg-button-primary"
												style={{
													margin: "5px",
													display: "none",
												}}
												onClick={(e: any) => {
													e.preventDefault();
													setVisibleModalSubmit(true);
												}}
											>
												{ctx.t({
													code: "common.validate_or_return",
													msg: "Validate or Return",
												})}
											</Button>
										</>
									)}
									{props.extraActions}
								</div>
							</>
						)}
						<h2>{props.title}</h2>
						<p>
							{ctx.t({
								code: "common.id",
								msg: "ID",
							})}
							: {String(props.id)}
						</p>
						{props.extraInfo}
						{props.children}
					</form>
				</>
			</MainContainer>
		</>
	);
}

export function ViewComponent(props: ViewComponentProps) {
	const ctx = props.ctx;
	return (
		<MainContainer title={props.title}>
			<>
				<form className="dts-form">
					<p>
						<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
							{props.title}
						</LangLink>
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
										code: "common.edit",
										msg: "Edit",
									})}
								</LangLink>
								<DeleteButton
									ctx={ctx}
									useIcon={true}
									action={ctx.url(`${props.path}/delete/${String(props.id)}`)}
								/>
							</div>
							{props.extraActions}
						</>
					)}
					<h2>{props.title}</h2>
					<p>
						{ctx.t({
							code: "common.id",
							msg: "ID",
						})}
						: {String(props.id)}
					</p>
					{props.extraInfo}
					{props.children}
				</form>
			</>
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

	title: string;
	editLabel: string;
	addLabel: string;

	overrideSubmitMainForm?: React.ReactElement;
}

export function FormView(props: FormViewProps) {
	if (!props.fieldsDef) {
		throw new Error("props.fieldsDef not passed to FormView");
	}
	if (!Array.isArray(props.fieldsDef)) {
		console.log("props.fieldsDef", props.fieldsDef);
		throw new Error("props.fieldsDef must be an array");
	}
	let ctx = props.ctx;
	const title = props.title;

	let inputsRef = useRef<HTMLDivElement>(null);
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting" || navigation.state === "loading";
	let [intClickedCtr, setIntClickedCtr] = useState(0);

	useEffect(() => {
		const formElement = document.querySelector<HTMLFormElement>(".dts-form");
		const formElementSubmit = document.querySelector<HTMLButtonElement>(
			"#form-default-submit-button",
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
						<LangLink lang={ctx.lang} to={props.listUrl || props.path}>
							{title}
						</LangLink>
					</p>
					{props.edit && props.id && (
						<p>
							<LangLink
								lang={ctx.lang}
								to={props.viewUrl || `${props.path}/${props.id}`}
							>
								{ctx.t({
									code: "common.view",
									msg: "View",
								})}
							</LangLink>
						</p>
					)}
					<h2>{props.edit ? props.editLabel : props.addLabel}</h2>
					{props.edit && props.id && (
						<p>
							{ctx.t({
								code: "common.id",
								msg: "ID",
							})}
							: {String(props.id)}
						</p>
					)}
					{props.infoNodes}
				</section>

				<Form
					ctx={props.ctx}
					formRef={props.formRef}
					errors={props.errors}
					className="dts-form"
					id={props.id ? `${props.id}` : "form-new"}
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
								code: "common.save",
								msg: "Save",
							})}
						/>

						{props.overrideSubmitMainForm ? (
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
						)}
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
						aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
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
						aria-label={ctx.t({ code: "common.view", msg: "View" })}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideDeleteButton && canDelete(props.approvalStatus, ctx.user) && (
				<DeleteButton
					ctx={ctx}
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
	return (
		approvalStatus?.toLowerCase() !== "published" &&
		approvalStatus?.toLowerCase() !== "validated"
	);
}
