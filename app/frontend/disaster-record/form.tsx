import { DisasterRecordsFields, DisasterRecordsViewModel } from "~/backend.server/models/disaster_record"

import { formatDate } from "~/util/date";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	FieldErrors,
	Field,
	ViewComponent,
	WrapInputBasic
} from "~/frontend/form";

import { useEffect, useState } from 'react';
import { approvalStatusField2 } from "~/frontend/approval";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "~/routes/$lang+/disaster-record+/content-picker-config";
import AuditLogHistory from "~/components/AuditLogHistory";
import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";

import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "../context";

import { LangLink } from "~/util/link";
import { DContext } from "~/util/dcontext";

export const route = "/disaster-record"

export function fieldsDefCommon(ctx: DContext): FormInputDef<DisasterRecordsFields>[] {
	return [
		approvalStatusField2(ctx) as FormInputDef<DisasterRecordsFields>,
		{
			key: "locationDesc",
			label: ctx.t({
				"code": "disaster_record.location_description",
				"msg": "Location description"
			}),
			type: "text"
		},
		{
			key: "startDate",
			label: ctx.t({
				"code": "common.start_date",
				"msg": "Start date"
			}),
			type: "date_optional_precision",
			uiRow: {}
		},
		{
			key: "endDate",
			label: ctx.t({
				"code": "common.end_date",
				"msg": "End date"
			}),
			type: "date_optional_precision"
		},
		{
			key: "localWarnInst",
			label: ctx.t({
				"code": "disaster_record.local_warning_instructions",
				"msg": "Local warning and local instructions (recommended actions)"
			}),
			type: "text",
			uiRowNew: true
		},
		{
			key: "primaryDataSource",
			label: ctx.t({
				"code": "disaster_record.primary_data_source",
				"msg": "Primary data source"
			}),
			type: "text",
			required: true,
			uiRow: {}
		},
		{
			key: "otherDataSource",
			label: ctx.t({
				"code": "disaster_record.other_data_source",
				"msg": "Other data sources"
			}),
			type: "text"
		},
		{
			key: "fieldAssessDate",
			label: ctx.t({
				"code": "disaster_record.field_assessment_date",
				"desc": "Label for field assessment conducted date",
				"msg": "Field assessment conducted"
			}),
			type: "date",
			uiRow: {}
		},
		{
			key: "assessmentModes",
			label: ctx.t({
				"code": "disaster_record.assessment_modes",
				"msg": "Assessments methodologies"
			}),
			type: "textarea"
		},
		{
			key: "originatorRecorderInst",
			label: ctx.t({
				"code": "disaster_record.recording_institution",
				"msg": "Recording institution"
			}),
			type: "text",
			required: true,
			uiRow: {}
		},
		{
			key: "validatedBy",
			label: ctx.t({
				"code": "disaster_record.validated_by",
				"msg": "Validated by"
			}),
			type: "text",
			required: true
		},
		{
			key: "checkedBy",
			label: ctx.t({
				"code": "disaster_record.checked_by",
				"msg": "Checked by"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "dataCollector",
			label: ctx.t({
				"code": "disaster_record.data_collector",
				"msg": "Data collector"
			}),
			type: "text"
		},
		{
			key: "legacyData",
			label: ctx.t({
				"code": "common.legacy_data",
				"msg": "Legacy data"
			}),
			type: "json",
			uiRow: { colOverride: 1 }
		},
		{
			key: "spatialFootprint",
			label: ctx.t({
				"code": "spatial_footprint",
				"msg": "Spatial footprint"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true
		},
		{
			key: "attachments",
			label: ctx.t({
				"code": "attachments",
				"msg": "Attachments"
			}),
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true
		}
	];
}

export function fieldsDef(ctx: DContext): FormInputDef<DisasterRecordsFields>[] {
	return [
		{ key: "disasterEventId", label: "", type: "uuid" },
		{
			key: "hipHazardId",
			label: ctx.t({
				"code": "hip.hazard",
				"msg": "Hazard"
			}),
			type: "other",
			uiRow: { colOverride: 1 }
		},
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(ctx)
	];
}

export function fieldsDefApi(ctx: DContext): FormInputDef<DisasterRecordsFields>[] {
	return [
		...fieldsDef(ctx),
		{ key: "apiImportId", label: "", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

// Use keyof to ensure type safety
export function fieldsDefView(ctx: DContext): FormInputDef<Partial<DisasterRecordsViewModel>>[] {
	return [
		{ key: "disasterEventId" as keyof DisasterRecordsViewModel, label: "", type: "uuid" },
		{ key: "hipHazard" as keyof DisasterRecordsViewModel, label: "", type: "other" },
		...fieldsDefCommon(ctx) as unknown as FormInputDef<Partial<DisasterRecordsViewModel>>[],
		{ key: "createdAt" as keyof DisasterRecordsViewModel, label: "", type: "other" },
		{ key: "updatedAt" as keyof DisasterRecordsViewModel, label: "", type: "other" },
	];
}

interface DisasterRecordsFormProps extends UserFormProps<DisasterRecordsFields> {
	hip: Hip;
	parent?: DisasterRecordsViewModel;
	treeData: any[];
	cpDisplayName?: string;
	ctryIso3?: string;
	divisionGeoJSON?: any[];
}

export function disasterRecordsLabel(args: {
	id?: string;
	disasterEventId?: string;
}): string {
	const disasterEventId = args.disasterEventId;
	const shortId = args.id ? " " + args.id.slice(0, 8) : "";
	return disasterEventId + " " + shortId;
}

export function disasterRecordsLink(args: {
	ctx: ViewContext;
	id: string;
	disasterEventId: string;
}) {
	let ctx = args.ctx
	return <LangLink lang={ctx.lang} to={`/disaster-record/${args.id}`}>
		{disasterRecordsLabel(args)}
	</LangLink>
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {
	const { fields, treeData, cpDisplayName, ctryIso3, divisionGeoJSON, ctx } = props;

	useEffect(() => {
	}, []);

	let hazardousEventLinkInitial: "none" | "disaster_event" = "none"
	if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event"
	}

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(hazardousEventLinkInitial)

	return (
		<>
			<FormView
				ctx={ctx}
				user={props.user}
				path={route}
				edit={props.edit}
				id={props.id}
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef(ctx)}
				title={ctx.t({ "code": "disaster_records", "msg": "Disaster records" })}
				editLabel={ctx.t({ "code": "disaster_records.edit", "msg": "Edit disaster record" })}
				addLabel={ctx.t({ "code": "disaster_records.add", "msg": "Add disaster record" })}

				infoNodes={<>
					<div className="mg-grid mg-grid__col-3">
						<WrapInputBasic
							label={ctx.t({
								"code": "common.linking_parameter",
								"msg": "Linking parameter"
							})}
							child={
								<select defaultValue={hazardousEventLinkType} onChange={(e: any) => setHazardousEventLinkType(e.target.value)}>
									<option value="none">
										{ctx.t({
											"code": "common.no_link",
											"msg": "No link"
										})}
									</option>
									<option value="disaster_event">
										{ctx.t({
											"code": "disaster_event",
											"msg": "Disaster event"
										})}
									</option>
								</select>
							} />
					</div>
				</>}
				override={{
					disasterEventId:
						(hazardousEventLinkType == "disaster_event") ?
							<Field key="disasterEventId" label={ctx.t({
								"code": "disaster_event",
								"msg": "Disaster event"
							})}>
								<ContentPicker ctx={ctx} {...contentPickerConfig(ctx)} value={fields.disasterEventId || ""} displayName={cpDisplayName || ""} />
							</Field> : <input type="hidden" name="disasterEventId" value="" />,
					hipTypeId: null,
					hipClusterId: null,
					hipHazardId: (
						<Field
							key="hazardId"
							label={ctx.t({
								"code": "hip.hazard_classification",
								"msg": "Hazard classification"
							})}
						>
							<HazardPicker
								ctx={ctx}
								hip={props.hip}
								typeId={fields.hipTypeId}
								clusterId={fields.hipClusterId}
								hazardId={fields.hipHazardId}
							/>
							<FieldErrors errors={props.errors} field="hipHazardId"></FieldErrors>
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
								file_viewer_temp_url="/disaster-record/file-temp-viewer"
								file_viewer_url="/disaster-record/file-viewer?loc=record"
								api_upload_url="/disaster-record/file-pre-upload"
								initialData={fields?.attachments}
							/>
						</Field>
					)
				}}
			/>
		</>);
}

interface DisasterRecordsViewProps {
	ctx: ViewContext;
	item: DisasterRecordsViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const { ctx, item } = props;
	const auditLogs = props.auditLogs;
	const dataSource = (item as any)?.disasterRecord || [];

	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={props.isPublic}
			path={route}
			id={item?.id || ''}
			title={ctx.t({
				"code": "disaster_records",
				"msg": "Disaster records"
			})}
		// extraActions={
		// 	<ul>
		// 		<li><LangLink to={"/disaster-record/edit-sub/" + item.id + "/human-effects"}>Human Direct Effects</Link></li>
		// 		<li><LangLink to={"/disaster-record/edit-sub/" + item.id + "/damages?sectorId=11"}>Damages (Sector id11)</Link></li>
		// 		<li><LangLink to={"/disaster-record/edit-sub/" + item.id + "/losses?sectorId=11"}>Losses (Sector id11)</Link></li>
		// 		<li><LangLink to={"/disaster-record/edit-sub/" + item.id + "/disruptions?sectorId=11"}>Disruptions (Sector id11)</Link></li>
		// 	</ul>
		// }
		>
			<FieldsView
				def={fieldsDefView(ctx)}
				fields={item}
				user={ctx.user || undefined}
				override={{
					hipHazard: (
						<div key="hazard">
							{ctx.t({
								"code": "hip.hazard",
								"msg": "Hazard"
							})}: {item?.hipHazardId
								? item.hipHazardId
								: ctx.t({
									"code": "common.not_available",
									"desc": "Not available",
									"msg": "N/A"
								})}
						</div>
					),
					createdAt: (
						<p key="createdAt">
							{ctx.t({
								"code": "common.created_at",
								"desc": "Created date",
								"msg": "Created at"
							})}: {item?.createdAt
								? formatDate(item.createdAt)
								: ctx.t({
									"code": "common.not_available",
									"desc": "Not available",
									"msg": "N/A"
								})}
						</p>
					),
					updatedAt: (
						<p key="updatedAt">
							{ctx.t({
								"code": "common.updated_at",
								"desc": "Last updated date",
								"msg": "Updated at"
							})}: {item?.updatedAt
								? formatDate(item.updatedAt)
								: ctx.t({
									"code": "common.not_available",
									"desc": "Not available",
									"msg": "N/A"
								})}
						</p>
					),
					disasterEventId: (
						<p key="disasterEventId">
							{ctx.t({
								"code": "disaster_event",
								"msg": "Disaster event"
							})}: {(item as any).cpDisplayName || ""}
						</p>
					),
					spatialFootprint: (
						<div key="debug1">
							<SpatialFootprintView
								ctx={ctx}
								initialData={(item?.spatialFootprint as any[]) || []}
								mapViewerOption={1}
								mapViewerDataSources={dataSource}
							/>
						</div>
					),
					attachments: (
						<AttachmentsView
							ctx={ctx}
							id={item?.id || ''}
							initialData={(item?.attachments as any[]) || []}
							file_viewer_url="/disaster-record/file-viewer?loc=record"
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
							"code": "audit_log.history",
							"msg": "Audit log history"
						})}
					</h3>
					<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}


