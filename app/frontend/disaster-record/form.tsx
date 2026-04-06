import {
	DisasterRecordsFields,
	DisasterRecordsViewModel,
} from "~/backend.server/models/disaster_record";

import { formatDate } from "~/utils/date";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	FieldErrors,
	Field,
	ViewComponent,
	WrapInputBasic,
} from "~/frontend/form";

import { useEffect, useState } from "react";
import { approvalStatusField2 } from "~/frontend/approval";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "~/routes/disaster-record+/content-picker-config";
import AuditLogHistory from "~/components/AuditLogHistory";
import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";

import { SpatialFootprintFormView } from "~/frontend/spatialFootprintFormView";
import { SpatialFootprintView } from "~/frontend/spatialFootprintView";
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";

import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "../context";

import { LangLink } from "~/utils/link";

export const route = "/disaster-record";


export function fieldsDefCommon(
): FormInputDef<DisasterRecordsFields>[] {
	return [
		approvalStatusField2() as FormInputDef<DisasterRecordsFields>,
		{
			key: "locationDesc",
			label: "Location description",
			type: "text",
		},
		{
			key: "startDate",
			label: "Start date",
			type: "date_optional_precision",
			uiRow: {},
		},
		{
			key: "endDate",
			label: "End date",
			type: "date_optional_precision",
		},
		{
			key: "localWarnInst",
			label: "Local warning and local instructions (recommended actions)",
			type: "text",
			uiRowNew: true,
		},
		{
			key: "primaryDataSource",
			label: "Primary data source",
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "otherDataSource",
			label: "Other data sources",
			type: "text",
		},
		{
			key: "fieldAssessDate",
			label: "Field assessment conducted",
			type: "date",
			uiRow: {},
		},
		{
			key: "assessmentModes",
			label: "Assessments methodologies",
			type: "textarea",
		},
		{
			key: "originatorRecorderInst",
			label: "Recording institution",
			type: "text",
			required: true,
			uiRow: {},
		},
		{
			key: "validatedBy",
			label: "Validated by",
			type: "text",
			required: true,
		},
		{
			key: "checkedBy",
			label: "Checked by",
			type: "text",
			uiRow: {},
		},
		{
			key: "dataCollector",
			label: "Data collector",
			type: "text",
		},
		{
			key: "legacyData",
			label: "Legacy data",
			type: "json",
			uiRow: { colOverride: 1 },
		},
		{
			key: "spatialFootprint",
			label: "Spatial footprint",
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
	];
}

export function fieldsDef(
): FormInputDef<DisasterRecordsFields>[] {
	return [
		{
			key: "disasterEventId",
			label: "Disaster Event ID",
			type: "uuid",
			mcpDescription:
				"ID of the disaster event this record belongs to. Use disaster-event_list to get available IDs.",
		},
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

export function fieldsDefApi(
): FormInputDef<DisasterRecordsFields>[] {
	return [
		...fieldsDef(),
		{ key: "apiImportId", label: "", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

// Use keyof to ensure type safety
export function fieldsDefView(
): FormInputDef<Partial<DisasterRecordsViewModel>>[] {
	return [
		{
			key: "disasterEventId" as keyof DisasterRecordsViewModel,
			label: "",
			type: "uuid",
		},
		{
			key: "hipHazard" as keyof DisasterRecordsViewModel,
			label: "",
			type: "other",
		},
		...(fieldsDefCommon() as unknown as FormInputDef<
			Partial<DisasterRecordsViewModel>
		>[]),
		{
			key: "createdAt" as keyof DisasterRecordsViewModel,
			label: "",
			type: "other",
		},
		{
			key: "updatedAt" as keyof DisasterRecordsViewModel,
			label: "",
			type: "other",
		},
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
	id: string;
	disasterEventId: string;
}) {
	return (
		<LangLink lang={"en"} to={`/disaster-record/${args.id}`}>
			{disasterRecordsLabel(args)}
		</LangLink>
	);
}

export function DisasterRecordsForm(props: DisasterRecordsFormProps) {
	const { fields, treeData, cpDisplayName, ctryIso3, divisionGeoJSON } =
		props;

	useEffect(() => { }, []);

	let hazardousEventLinkInitial: "none" | "disaster_event" = "none";
	if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event";
	}

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(
		hazardousEventLinkInitial,
	);

	return (
		<>
			<FormView
				user={props.user}
				path={route}
				edit={props.edit}
				id={props.id}
				errors={props.errors}
				fields={props.fields}
				fieldsDef={fieldsDef()}
				title={"Disaster records"}
				editLabel={"Edit disaster record"}
				addLabel={"Add disaster record"}
				infoNodes={
					<>
						<div className="mg-grid mg-grid__col-3">
							<WrapInputBasic
								label={"Linking parameter"}
								child={
									<select
										defaultValue={hazardousEventLinkType}
										onChange={(e: any) =>
											setHazardousEventLinkType(e.target.value)
										}
									>
										<option value="none">
											{"No link"}
										</option>
										<option value="disaster_event">
											{"Disaster event"}
										</option>
									</select>
								}
							/>
						</div>
					</>
				}
				override={{
					disasterEventId:
						hazardousEventLinkType == "disaster_event" ? (
							<Field
								key="disasterEventId"
								label={"Disaster event"}
							>
								<ContentPicker
									{...contentPickerConfig()}
									value={fields.disasterEventId || ""}
									displayName={cpDisplayName || ""}
								/>
							</Field>
						) : (
							<input type="hidden" name="disasterEventId" value="" />
						),
					hipTypeId: null,
					hipClusterId: null,
					hipHazardId: (
						<Field
							key="hazardId"
							label={"Hazard classification"}
						>
							<HazardPicker
								hip={props.hip}
								typeId={fields.hipTypeId}
								clusterId={fields.hipClusterId}
								hazardId={fields.hipHazardId}
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
								save_path_temp={TEMP_UPLOAD_PATH}
								file_viewer_temp_url="/disaster-record/file-temp-viewer"
								file_viewer_url="/disaster-record/file-viewer?loc=record"
								api_upload_url="/disaster-record/file-pre-upload"
								initialData={fields?.attachments}
							/>
						</Field>
					),
				}}
			/>
		</>
	);
}

interface DisasterRecordsViewProps {
	ctx?: ViewContext;
	item: DisasterRecordsViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterRecordsView(props: DisasterRecordsViewProps) {
	const ctx = props.ctx || { t: (msg: any) => msg.msg, lang: "en", url: (p: string) => p, user: undefined };
	const { item } = props;
	const auditLogs = props.auditLogs;
	const dataSource = (item as any)?.disasterRecord || [];

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item?.id || ""}
			title={"Disaster records"}
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
				def={fieldsDefView()}
				fields={item}
				user={ctx.user || undefined}
				override={{
					hipHazard: (
						<div key="hazard">
							{"Hazard"}
							:{" "}
							{item?.hipHazardId
								? item.hipHazardId
								: "N/A"}
						</div>
					),
					createdAt: (
						<p key="createdAt">
							{"Created at"}
							:{" "}
							{item?.createdAt
								? formatDate(item.createdAt)
								: "N/A"}
						</p>
					),
					updatedAt: (
						<p key="updatedAt">
							{"Updated at"}
							:{" "}
							{item?.updatedAt
								? formatDate(item.updatedAt)
								: "N/A"}
						</p>
					),
					disasterEventId: (
						<p key="disasterEventId">
							{"Disaster event"}
							: {(item as any).cpDisplayName || ""}
						</p>
					),
					spatialFootprint: (
						<div key="debug1">
							<SpatialFootprintView
								initialData={(item?.spatialFootprint as any[]) || []}
								mapViewerOption={1}
								mapViewerDataSources={dataSource}
							/>
						</div>
					),
					attachments: (
						<AttachmentsView
							id={item?.id || ""}
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
						{"Audit log history"}
					</h3>
					<AuditLogHistory auditLogs={auditLogs} />
				</>
			)}
		</ViewComponent>
	);
}

