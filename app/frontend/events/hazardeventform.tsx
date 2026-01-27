
import {
	HazardousEventFields,
	HazardousEventViewModel,
} from "~/backend.server/models/event";

import {
	Field,
	FieldErrors,
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponentMainDataCollection,
} from "~/frontend/form";

import { formatDate } from "~/util/date";

import { useEffect, useRef, useState } from "react";
import { approvalStatusField2 } from "~/frontend/approval";

import AuditLogHistory from "~/components/AuditLogHistory";
import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";
import { HipHazardInfo } from "~/frontend/hip/hip";

import { SpatialFootprintFormView } from "~/frontend/spatialFootprintFormView";
import { SpatialFootprintView } from "~/frontend/spatialFootprintView";
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";

import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";
import { DContext } from "~/util/dcontext";
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { canAddNewRecord } from "../user/roles";


export const route = "/hazardous-event";

export function fieldsDefCommon(ctx: DContext): FormInputDef<HazardousEventFields>[] {
	return [
		approvalStatusField2(ctx) as any,
		{
			key: "nationalSpecification",
			label: ctx.t({
				"code": "hazardous_event.national_specification",
				"msg": "National specification"
			}),
			type: "textarea",
		},
		{
			key: "startDate",
			label: ctx.t({
				"code": "common.start_date",
				"msg": "Start date"
			}),
			type: "date_optional_precision",
			required: true,
			uiRow: {},
		},
		{
			key: "endDate",
			label: ctx.t({
				"code": "common.end_date",
				"msg": "End date"
			}),
			type: "date_optional_precision",
			required: true,
		},
		{
			key: "description",
			label: ctx.t({
				"code": "common.description",
				"msg": "Description"
			}),
			type: "textarea",
			uiRowNew: true,
		},
		{
			key: "chainsExplanation",
			label: ctx.t({
				"code": "hazardous_event.chains_explanation",
				"desc": "Label for chains explanation field",
				"msg": "Composite event - chains explanation"
			}),
			type: "textarea",
		},
		{
			key: "magnitude",
			label: ctx.t({
				"code": "hazardous_event.magnitude",
				"desc": "Label for magnitude field",
				"msg": "Magnitude"
			}),
			type: "text",
		},
		{
			key: "spatialFootprint",
			label: ctx.t({
				"code": "spatial_footprint",
				"msg": "Spatial footprint"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: ctx.t({
				"code": "common.attachments",
				"msg": "Attachments"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "recordOriginator",
			label: ctx.t({
				"code": "hazardous_event.record_originator",
				"msg": "Record originator"
			}),
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "hazardousEventStatus",
			label: ctx.t({
				"code": "hazardous_event.status",
				"msg": "Hazardous event Status"
			}),
			type: "enum",
			enumData: [
				{
					key: "forecasted",
					label: ctx.t({
						"code": "hazardous_event.status.forecasted",
						"desc": "Status label: forecasted",
						"msg": "Forecasted"
					})
				},
				{
					key: "ongoing",
					label: ctx.t({
						"code": "hazardous_event.status.ongoing",
						"desc": "Status label: ongoing",
						"msg": "Ongoing"
					})
				},
				{
					key: "passed",
					label: ctx.t({
						"code": "hazardous_event.status.passed",
						"desc": "Status label: passed",
						"msg": "Passed"
					})
				},
			],
			uiRowNew: true,
		},
		{
			key: "dataSource",
			label: ctx.t({
				"code": "hazardous_event.data_source",
				"msg": "Data source"
			}),
			type: "text",
		},
		// {
		// 	key: "tableValidatorUserIds",
		// 	label: "",
		// 	type: "table_uuid",
		// },
		{
			key: "tempValidatorUserIds",
			label: "",
			type: "temp_hidden",
		},
		{
			key: "tempAction",
			label: "",
			type: "temp_hidden",
		},
	]
};

export function fieldsDef(ctx: DContext): FormInputDef<HazardousEventFields>[] {
	return [
		{ key: "parent", label: "", type: "uuid" },
		{
			key: "hipHazardId",
			label: "Hazard test",
			type: "other",
			uiRow: { colOverride: 1 },
		},
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(ctx),
	];
}

export function fieldsDefApi(ctx: DContext): FormInputDef<HazardousEventFields>[] {
	let fieldsDefTemp = fieldsDef(ctx);

	// Remove in the field definitions any properties for key that starts with "table" 
	// or type that starts with "temp_hidden"
	const filteredFieldsDef = fieldsDefTemp.filter(item => 
		!item.key.startsWith("table") && !item.type.startsWith("temp_hidden")
	);

	return [
		...filteredFieldsDef,
		{ key: "apiImportId", label: "API Import ID", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

export function fieldsDefView(ctx: DContext): FormInputDef<HazardousEventViewModel>[] {
	return [
		{ key: "hipHazard", label: "", type: "other" },
		...(fieldsDefCommon(ctx) as any),
		{ key: "createdAt", label: "", type: "other" },
		{ key: "updatedAt", label: "", type: "other" },
	];
}

interface HazardousEventFormProps extends UserFormProps<HazardousEventFields> {
	divisionGeoJSON?: any;
	ctryIso3?: any;
	hip: Hip;
	parent?: HazardousEventViewModel;
	treeData?: any[];
	usersWithValidatorRole?: any[];
	extraHiddenFields?: any;
}

export function hazardousEventLabel(args: {
	id?: string;
	description?: string;
	hazard?: { nameEn: string };
}): string {
	let parts: string[] = [];
	if (args.hazard) {
		parts.push(args.hazard.nameEn.slice(0, 50));
	}
	if (args.description) {
		parts.push(args.description.slice(0, 50));
	}
	if (args.id) {
		parts.push(args.id.slice(0, 5));
	}
	return parts.join(" ");
}

export function hazardousEventLongLabel(args: {
	id?: string;
	description?: string;
	hazard: { nameEn: string };
}) {
	return (
		<ul>
			<li>ID: {args.id}</li>
			<li>Description: {args.description || "-"}</li>
			<li>Hazard: {args.hazard.nameEn}</li>
		</ul>
	);
}
export function hazardousEventLink(ctx: ViewContext, args: {
	id: string;
	description: string;
	hazard?: { nameEn: string };
}) {
	return (
		<LangLink lang={ctx.lang} to={`/hazardous-event/${args.id}`}>{hazardousEventLabel(args)}</LangLink>
	);
}

interface UserValidator {
	name: string;
	id: string;
	email: string;
}

export function HazardousEventForm(props: HazardousEventFormProps) {
	const ctx = props.ctx;
	const fields = props.fields;
	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	const [selected, setSelected] = useState(props.parent);
	const [selectedUserValidator, setSelectedUserValidator] = useState<UserValidator | null>(null);
	const [selectedAction, setSelectedAction] = useState<string>("submit-draft");

	// How to set default selected users with validator role
	// const [selectedUserValidator, setSelectedUserValidator] = useState<UserValidator | null>([
	// 	usersWithValidatorRole[1], // Example user
	//  usersWithValidatorRole[3]  // Example user
	// ]);
	const usersWithValidatorRole: any[] = props.usersWithValidatorRole?.map((user: any) => ({
		name: user.firstName + ' ' + user.lastName,
		id: user.id,
		email: user.email,
	})) || [];
	// console.log(
	// 	selectedCities.map((c) => c.name).join(", ")
	// );



	const overrideSubmitButton = <>
		<button type="button" className="mg-button mg-button-primary"
			onClick={(e: any) => {
				e.preventDefault();
				setVisibleModalSubmit(true);
			}}
			style={{
				display: "none"
			}}
		>
			{ctx.t({
				"code": "common.savesubmit",
				"desc": "Label for save submit action",
				"msg": "Save or Submit"
			})}
		</button>
		<button type="button" className="mg-button mg-button-system"
			onClick={(e: any) => {
				e.preventDefault();
				setVisibleModalDiscard(true);
			}}
			style={{
				display: "none"
			}}
		>
			{ctx.t({
				"code": "common.discard",
				"desc": "Label for disregard action",
				"msg": "Discard"
			})}
		</button>
	</>;

	const [visibleModalSubmit, setVisibleModalSubmit] = useState<boolean>(false);
	const [visibleModalDiscard, setVisibleModalDiscard] = useState<boolean>(false);
	const btnRefSubmit = useRef(null);

	useEffect(() => {
		const handleMessage = (event: any) => {
			if (event.data?.selected) {
				setSelected(event.data.selected);
			}
		};
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, [props.id]);

	// Modal submit validation function
	function validateBeforeSubmit(selectedAction: string, selectedUserValidator: UserValidator | null): boolean {

		// Set the hidden fields before submitting the main form
		const tempActionField = document.getElementById('tempAction') as HTMLInputElement;
		if (tempActionField) {
			tempActionField.value = selectedAction;
		}
		const tempValidatorField = document.getElementById("tempValidatorUserIds") as HTMLInputElement;
		if (tempValidatorField) {
			tempValidatorField.value = '';
		}

		// Require at least one validator
		if (selectedAction === 'submit-validation') {
			// if (!selectedUserValidator || (Array.isArray(selectedUserValidator) && selectedUserValidator.length === 0)) {
			// 	alert('Please select at least one validator.');
			// 	return false;
			// }

			// console.log(
			// 	Array.isArray(selectedUserValidator)
			// 		// ? selectedUserValidator.map((c) => c.id)
			// 		? selectedUserValidator.map((c) => c.email).join(",")
			// 		: selectedUserValidator?.email || ""
			// );
			// console.log(
			// 	Array.isArray(selectedUserValidator)
			// 		? selectedUserValidator.map((c) => c.id).join('", "')
			// 		: selectedUserValidator?.id || ""
			// );

			// Extract just the IDs and join them as comma-separated string
			const validatorIds = Array.isArray(selectedUserValidator)
				? selectedUserValidator.map((c) => c.id).join(",")
				: selectedUserValidator?.id || ""

			//const validatorField = document.getElementById("tableValidatorUserIds") as HTMLInputElement;
			if (tempValidatorField) {
				tempValidatorField.value = validatorIds;
			}

			//console.log("validatorIds:", validatorIds);
			//console.log("tempValidatorField.value:", tempValidatorField.value);
			
			// return false;
		}
		// Add more validation as needed
		const submitBtn = document.getElementById('form-default-submit-button');
		if (submitBtn) {
			(submitBtn as HTMLButtonElement).click();
		}
		return true;
	}

	// const rootData = useRouteLoaderData<typeof rootLoader>("root");
	// console.log("Root loader data in HazardousEventForm:", rootData.common);

	const footerDialogSubmitSave = (
		<div>
			<Button
				ref={btnRefSubmit}
				disabled={selectedAction === 'submit-validation' && (!selectedUserValidator || (Array.isArray(selectedUserValidator) && selectedUserValidator.length === 0))}
				className="mg-button mg-button-primary"
				label={selectedAction === 'submit-draft' ? 
					ctx.t({"code": "common.save_draft", "msg": "Save as draft"})
					: 
					ctx.t({"code": "common.submit_for_validation", "msg": "Submit for validation"})
				}
				style={{ width: "100%" }}
				onClick={() => {
					if (validateBeforeSubmit(selectedAction, selectedUserValidator)) {
						setVisibleModalSubmit(false);
					}
				}}
				autoFocus
			/>
		</div>
	);

	const footerDialogDiscard = (<>
		<div>
			<Button
				ref={btnRefSubmit}
				className="mg-button mg-button-primary"
				label={ctx.t({"code": "common.save_draft", "msg": "Save as draft"})}
				style={{ width: "100%" }}
				onClick={() => {
					setSelectedAction("submit-draft");
					if (validateBeforeSubmit("submit-draft", selectedUserValidator)) {
						setVisibleModalDiscard(false);
					}
				}}
			/>
		</div>
		<div style={{ marginTop: "10px" }}>
			<Button
				ref={btnRefSubmit}
				className="mg-button mg-button-outline"
				label={ctx.t({"code": "common.discard_work_and_exit", "msg": "Discard work and exit"})}
				style={{ width: "100%" }}
				onClick={() => {
					document.location.href = ctx.url('/hazardous-event');
				}}
				autoFocus
			/>
		</div>
	</>);

	return (<>
		<div className="card flex justify-content-center">
			<Dialog visible={visibleModalDiscard} modal header={ctx.t({"code": "common.exit_confirmation", "msg": "Are you sure you want to exit?"})} footer={footerDialogDiscard} style={{ width: '50rem' }} onHide={() => { if (!visibleModalDiscard) return; setVisibleModalDiscard(false); }}>
				<div>
					<p>{ctx.t({"code": "common.unsaved_changes_warning", "msg": "If you leave this page, your work will not be saved."})}</p>
				</div>
			</Dialog>
			<Dialog visible={visibleModalSubmit} modal header={ctx.t({"code": "common.savesubmit", "msg": "Save or submit"})} footer={footerDialogSubmitSave} style={{ width: '50rem' }} onHide={() => { if (!visibleModalSubmit) return; setVisibleModalSubmit(false); }}>
				<div>
					<p>
						{ctx.t({"code": "validationflow.savesubmitmodal.decide_action", "msg": "Decide what you’d like to do with this data that you’ve added or updated."})}</p>
				</div>

				<div>
					<ul className="dts-attachments">
						<li className="dts-attachments__item" style={{ justifyContent: "left" }}>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__field--horizontal">
										<input
											type="radio"
											name="radiobuttonFieldsetName"
											aria-controls="linkAttachment"
											aria-expanded="false"
											checked={selectedAction === 'submit-draft'}
											onChange={() => setSelectedAction('submit-draft')}
										/>
									</div>
								</label>
							</div>
							<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
								<span>{ctx.t({"code": "common.save_draft", "msg": "Save as draft"})}</span>
								<span style={{ color: "#aaa" }}>{ctx.t({"code": "common.store_for_future_editing", "msg": "Store this entry for future editing"})}</span>
							</div>
						</li>
						<li className="dts-attachments__item" style={{ justifyContent: "left" }}>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__field--horizontal">
										<input
											type="radio"
											name="radiobuttonFieldsetName"
											aria-controls="linkAttachment"
											aria-expanded="false"
											checked={selectedAction === 'submit-validation'}
											onChange={() => setSelectedAction('submit-validation')}
										/>
									</div>
								</label>
							</div>
							<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
								<span>
									{ctx.t({"code": "common.submit_for_validation", "msg": "Submit for validation"})}</span>
								<span style={{ color: "#aaa" }}>{ctx.t({"code": "common.request_entry_validation", "msg": "Request this entry to be validated"})}</span>
								<div>* {ctx.t({"code": "common.select_validators", "msg": "Select validator(s)"})}</div>
								<div>
									<MultiSelect
										filter
										value={selectedUserValidator}
										disabled={selectedAction !== 'submit-validation'}
										onChange={(e: MultiSelectChangeEvent) => setSelectedUserValidator(e.value)}
										options={usersWithValidatorRole}
										optionLabel="name"
										placeholder={ctx.t({"code": "common.select_validators", "msg": "Select validator(s)"})} maxSelectedLabels={3} className="w-full md:w-20rem"
									/>
								</div>

							</div>
						</li>

					</ul>
				</div>
			</Dialog>
		</div>
		<FormView
			ctx={ctx}
			user={props.user}
			path={route}
			edit={props.edit}
			id={props.id}

			title={ctx.t({ "code": "hazardous_events", "msg": "Hazardous events" })}
			editLabel={ctx.t({ "code": "hazardous_events.edit", "msg": "Edit hazardous event" })}
			addLabel={ctx.t({ "code": "hazardous_events.add", "msg": "Add hazardous event" })}

			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef(ctx)}
			elementsAfter={{}}
			overrideSubmitMainForm={overrideSubmitButton}
			override={{
				parent: (
					<Field
						key="parent"
						label={ctx.t({
							"code": "event.parent",
							"desc": "Label for parent event field",
							"msg": "Parent"
						})}
					>
						{selected ? hazardousEventLink(ctx, selected) : "-"}&nbsp;
						<LangLink lang={ctx.lang} target="_blank" rel="opener" to={"/hazardous-event/picker"} className="mx-2">
							{ctx.t({
								"code": "common.change",
								"desc": "Label for change action link or button",
								"msg": "Change"
							})}
						</LangLink>
						<button
							className="mg-button mg-button-outline"
							onClick={(e: any) => {
								e.preventDefault();
								setSelected(undefined);
							}}
						>
							{ctx.t({
								"code": "common.unset",
								"desc": "Label for unset or clear value action",
								"msg": "Unset"
							})}
						</button>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				),
				hipTypeId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId" label={`${ctx.t({
						"code": "hip.hazard_classification",
						"desc": "Label for hazard classification field",
						"msg": "Hazard classification"
					})} *`}>
						<HazardPicker
							ctx={ctx}
							hip={props.hip}
							typeId={fields.hipTypeId}
							clusterId={fields.hipClusterId}
							hazardId={fields.hipHazardId}
							required={true}
						/>
						<FieldErrors
							errors={props.errors}
							field="hipHazardId"
						></FieldErrors>
					</Field>
				),
				spatialFootprint: (
					<Field key="spatialFootprint" label="">
						<SpatialFootprintFormView
							ctx={ctx}
							divisions={divisionGeoJSON}
							ctryIso3={ctryIso3 || ""}
							treeData={treeData ?? []}
							initialData={fields?.spatialFootprint}
						/>
					</Field>
				),
				attachments: (
					<Field key="attachments" label="">
						<AttachmentsFormView
							ctx={ctx}
							save_path_temp={TEMP_UPLOAD_PATH}
							file_viewer_temp_url={`/${ctx.lang}/hazardous-event/file-temp-viewer`}
							file_viewer_url="/hazardous-event/file-viewer"
							api_upload_url="/hazardous-event/file-pre-upload"
							initialData={fields?.attachments}
						/>
					</Field>
				),
			}}
		/>
	</>);
}

interface HazardousEventViewProps {
	ctx: ViewContext;
	item: HazardousEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
	countryAccountsId?: string;
}

export function HazardousEventView(props: HazardousEventViewProps) {
	const ctx = props.ctx;
	const item = props.item;
	const auditLogs = props.auditLogs;

	let recordTitle:string = '';
	if (item.hipHazard) {
		recordTitle += item.hipHazard.nameEn;
	}
	else if (item.hipCluster) {
		recordTitle += item.hipCluster.nameEn;
	}
	else if (item.hipType) {
		recordTitle += item.hipType.nameEn;
	}
	
	let recordDate:string = item.startDate;
	if (item.endDate && item.endDate !== item.startDate) {
		recordDate += item.endDate ? ` to ${item.endDate}` : '';
	}

	let recordRecipient:string = '';
	if (item.userSubmittedBy) {
		recordRecipient += item.userSubmittedBy.firstName;
		recordRecipient += ' ' + item.userSubmittedBy.lastName;
		recordRecipient += ' (' + item.userSubmittedBy.email + ')';
	}

	return (
		<ViewComponentMainDataCollection
			recordDate={recordDate}
			recordTitle={recordTitle}
			recordRecipient={recordRecipient}
			approvalStatus={item.approvalStatus}
			ctx={props.ctx}
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			title={ctx.t({
				"code": "hazardous_events",
				"desc": "Label used in multiple places to refer to this type of records",
				"msg": "Hazardous events"
			})}
			extraActions={
				<>
					<p>
						<LangLink visible={canAddNewRecord(ctx.user?.role ?? null)} lang={ctx.lang} to={`${route}/new?parent=${item.id}`}>
							{ctx.t({
								"code": "hazardous_event.add_cause",
								"desc": "Label for adding a hazardous event caused by another event",
								"msg": "Add hazardous event caused by this event"
							})}

						</LangLink>
					</p>
				</>
			}
			extraInfo={
				<>
					{item.event &&
						item.event.ps &&
						item.event.ps.length > 0 &&
						(() => {
							const parent = item.event.ps[0].p.he;
							return (
								<p>
									{ctx.t({
										"code": "hazardous_event.caused_by",
										"desc": "Label for the 'Caused by' relationship",
										"msg": "Caused by"
									})}:&nbsp;
									{hazardousEventLink(ctx, parent)}
								</p>
							);
						})()}

					{item.event && item.event.cs && item.event.cs.length > 0 && (
						<>
							<p>
								{ctx.t({
									"code": "hazardous_event.causing",
									"desc": "Label for the list of events caused by this event",
									"msg": "Causing"
								})}:
							</p>
							{item.event.cs.map((child) => {
								const childEvent = child.c.he;
								return (
									<p key={child.childId}>{hazardousEventLink(ctx, childEvent)}</p>
								);
							})}
						</>
					)}
				</>
			}
		>
			<FieldsView
				def={fieldsDefView(ctx)}
				fields={item}
				elementsAfter={{}}
				override={{
					hipHazard: <HipHazardInfo ctx={ctx} key="hazard" model={item} />,
					createdAt: (
						<p key="createdAt">
							{ctx.t({
								"code": "record.created_at",
								"desc": "Label for creation timestamp",
								"msg": "Created at"
							})}: {formatDate(item.createdAt)}
						</p>
					),
					updatedAt: (
						<p key="updatedAt">
							{ctx.t({
								"code": "record.updated_at",
								"desc": "Label for last updated timestamp",
								"msg": "Updated at"
							})}: {formatDate(item.updatedAt)}
						</p>
					),
					spatialFootprint: (
						<SpatialFootprintView
							ctx={ctx}
							initialData={(item?.spatialFootprint as any[]) || []}
							mapViewerOption={0}
							mapViewerDataSources={[]}
						/>
					),
					attachments: (
						<AttachmentsView
							ctx={ctx}
							id={item.id}
							initialData={(item?.attachments as any[]) || []}
							file_viewer_url="/hazardous-event/file-viewer"
							countryAccountsId={(() => {
								// Use a type guard to ensure we return string or undefined
								const id = props.countryAccountsId || item.countryAccountsId;
								return typeof id === "string" ? id : undefined;
							})()}
						/>
					),
				}}
			/>
			{/* Add Audit log history at the end */}
			<br />
			{auditLogs && auditLogs.length > 0 && (
				<>
					<h3>
						{ctx.t({
							"code": "audit_log.history_title",
							"desc": "Title for the audit log history section",
							"msg": "Audit log history"
						})}
					</h3>
					<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
				</>
			)}
		</ViewComponentMainDataCollection>
	);
}
