
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
	ViewComponent,
} from "~/frontend/form";

import { formatDate } from "~/util/date";

import { useEffect, useState } from "react";
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

export const route = "/hazardous-event";

export function fieldsDefCommon(ctx: DContext): FormInputDef<HazardousEventFields>[] {
	return [
		approvalStatusField2(ctx) as any,
		{
			key: "nationalSpecification",
			label: ctx.t({
				"code": "hazardous_event.national_specification",
				"desc": "Label for national specification field",
				"msg": "National specification"
			}),
			type: "textarea",
		},
		{
			key: "startDate",
			label: ctx.t({
				"code": "hazardous_event.start_date",
				"desc": "Label for start date field",
				"msg": "Start Date"
			}),
			type: "date_optional_precision",
			required: true,
			uiRow: {},
		},
		{
			key: "endDate",
			label: ctx.t({
				"code": "hazardous_event.end_date",
				"desc": "Label for end date field",
				"msg": "End Date"
			}),
			type: "date_optional_precision",
			required: true,
		},
		{
			key: "description",
			label: ctx.t({
				"code": "hazardous_event.description",
				"desc": "Label for description field",
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
				"msg": "Composite Event - Chains Explanation"
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
				"code": "hazardous_event.spatial_footprint",
				"desc": "Label for spatial footprint field",
				"msg": "Spatial Footprint"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: ctx.t({
				"code": "hazardous_event.attachments",
				"desc": "Label for attachments field",
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
				"desc": "Label for record originator field",
				"msg": "Record Originator"
			}),
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "hazardousEventStatus",
			label: ctx.t({
				"code": "hazardous_event.status",
				"desc": "Label for hazardous event status field",
				"msg": "Hazardous Event Status"
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
				"desc": "Label for data source field",
				"msg": "Data Source"
			}),
			type: "text",
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
	return [
		...fieldsDef(ctx),
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

export function HazardousEventForm(props: HazardousEventFormProps) {
	const ctx = props.ctx;
	const fields = props.fields;
	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	const [selected, setSelected] = useState(props.parent);

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
	}, []);

	return (
		<FormView
			ctx={ctx}
			user={props.user}
			path={route}
			edit={props.edit}
			id={props.id}
			plural="hazardous events"
			singular="hazardous event"
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef(ctx)}
			elementsAfter={{}}
			title={ctx.t({
				"code": "hazardous_events",
				"desc": "Name for hazardous event records",
				"msg": "Hazardous events"
			})}
			addLabel={ctx.t({
				"code": "hazardous_event.add_label",
				"desc": "Label for adding a new hazardous event",
				"msg": "Add hazardous event"
			})}
			editLabel={ctx.t({
				"code": "hazardous_event.edit_label",
				"desc": "Label for editing an existing hazardous event",
				"msg": "Edit hazardous event"
			})}
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
							file_viewer_temp_url="/hazardous-event/file-temp-viewer"
							file_viewer_url="/hazardous-event/file-viewer"
							api_upload_url="/hazardous-event/file-pre-upload"
							initialData={fields?.attachments}
						/>
					</Field>
				),
			}}
		/>
	);
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

	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			title={ctx.t({
				"code": "hazardous_events",
				"desc": "Label used in multiple places to refer to these type of records",
				"msg": "Hazardous events"
			})}
			extraActions={
				<>
					<p>
						<LangLink lang={ctx.lang} to={`${route}/new?parent=${item.id}`}>
							{ctx.t({
								"code": "hazardous_event.add_cause",
								"desc": "Label for adding a hazardous event caused by another event",
								"msg": "Add Hazardous Event caused by this event"
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
										"desc": "Label for the 'Caused By' relationship",
										"msg": "Caused By"
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
			{/* Add Audit Log History at the end */}
			<br />
			{auditLogs && auditLogs.length > 0 && (
				<>
					<h3>
						{ctx.t({
							"code": "audit_log.history_title",
							"desc": "Title for the audit log history section",
							"msg": "Audit Log History"
						})}
					</h3>
					<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}
