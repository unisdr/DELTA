
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
import { approvalStatusField } from "~/frontend/approval";

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

export const route = "/hazardous-event";

export function fieldsDefCommon(): FormInputDef<HazardousEventFields>[] {
	return [
		approvalStatusField,
		{
			key: "nationalSpecification",
			label: "National specification",
			type: "textarea",
		},
		{
			key: "startDate",
			label: "Start Date",
			type: "date_optional_precision",
			required: true,
			uiRow: {},
		},
		{
			key: "endDate",
			label: "End Date",
			type: "date_optional_precision",
			required: true,
		},
		{
			key: "description",
			label: "Description",
			type: "textarea",
			uiRowNew: true,
		},
		{
			key: "chainsExplanation",
			label: "Composite Event - Chains Explanation",
			type: "textarea",
		},
		{ key: "magnitude", label: "Magnitude", type: "text" },
		{
			key: "spatialFootprint",
			label: "Spatial Footprint",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "attachments",
			label: "Attachments",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "recordOriginator",
			label: "Record Originator",
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "hazardousEventStatus",
			label: "Hazardous Event Status",
			type: "enum",
			enumData: [
				{ key: "forecasted", label: "Forecasted" },
				{ key: "ongoing", label: "Ongoing" },
				{ key: "passed", label: "Passed" },
			],
			uiRowNew: true,
		},
		{ key: "dataSource", label: "Data Source", type: "text" },
	]
};

export function fieldsDef(): FormInputDef<HazardousEventFields>[] {
	return [
		{ key: "parent", label: "", type: "uuid" },
		{
			key: "hipHazardId",
			label: "Hazard",
			type: "other",
			uiRow: { colOverride: 1 },
		},
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(),
	];
}

export function fieldsDefApi(): FormInputDef<HazardousEventFields>[] {
	return [
		...fieldsDef(),
		{ key: "apiImportId", label: "API Import ID", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

export function fieldsDefView(): FormInputDef<HazardousEventViewModel>[] {
	return [
		{ key: "hipHazard", label: "", type: "other" },
		...(fieldsDefCommon() as any),
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
			fieldsDef={fieldsDef()}
			elementsAfter={{}}
			override={{
				parent: (
					<Field key="parent" label="Parent">
						{selected ? hazardousEventLink(ctx, selected) : "-"}&nbsp;
						<LangLink lang={ctx.lang} target="_blank" rel="opener" to={"/hazardous-event/picker"} className="mx-2">
							Change
						</LangLink>
						<button
							className="mg-button mg-button-outline"
							onClick={(e: any) => {
								e.preventDefault();
								setSelected(undefined);
							}}
						>
							Unset
						</button>
						<input type="hidden" name="parent" value={selected?.id || ""} />
						<FieldErrors errors={props.errors} field="parent"></FieldErrors>
					</Field>
				),
				hipTypeId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId" label="Hazard classification *">
						<HazardPicker
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
			plural="Hazardous events"
			singular="Hazardous event"
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
				def={fieldsDefView()}
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
