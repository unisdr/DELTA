import { useMatches } from "react-router";

import { useEffect, useState, ReactElement } from "react";

import {
	DisasterEventFields,
	DisasterEventViewModel,
	DisasterEventBasicInfoViewModel,
} from "~/backend.server/models/event";

import { hazardousEventLink } from "~/frontend/events/hazardeventform";

import { LangLink } from "~/utils/link";

import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	FieldErrors,
	Field,
	WrapInputBasic,
	WrapInput,
} from "~/frontend/form";
import { approvalStatusField2 } from "../approval";
import { formatDate } from "~/utils/date";
import AuditLogHistory from "~/components/AuditLogHistory";
import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";
import { HipHazardInfo } from "~/frontend/hip/hip";

import { SpatialFootprintFormView } from "~/frontend/spatialFootprintFormView";
import { SpatialFootprintView } from "~/frontend/spatialFootprintView";
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "../context";

import { HazardousEventPickerType } from "~/routes/hazardous-event+/picker";

export const route = "/disaster-event";

const fallbackCtx: any = {
	t: (message: { msg: string }) => message.msg,
	lang: "en",
	url: (path: string) => path,
	user: undefined,
};


function repeatOtherIds(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		res.push({
			key: "otherId" + (i + 1),
			label:
				"Event ID in other system" + ` (${i + 1})`,
			type: "text",
			uiRow: i == 0 ? {} : undefined,
			repeatable: { group: "otherId", index: i },
		});
	}
	return res as FormInputDef<DisasterEventFields>[];
}

function repeatEarlyActions(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		res.push(
			{
				key: `earlyActionDescription` + (i + 1),
				label: "Description",
				type: "textarea",
				uiRow: {
					label:
						"Early action" + ` (${i + 1})`,
				},
				repeatable: { group: "earlyAction", index: i },
			},
			{
				key: `earlyActionDate` + (i + 1),
				label: "Date",
				type: "date",
				repeatable: { group: "earlyAction", index: i },
			},
		);
	}
	return res as FormInputDef<DisasterEventFields>[];
}

function repeatDisasterDeclarations(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;
		res.push(
			{
				key: "disasterDeclarationTypeAndEffect" + j,
				label: "Type and Effect",
				type: "textarea",
				uiRow: {
					label:
						"Disaster declaration" + ` (${j})`,
				},
				repeatable: { group: "disasterDeclaration", index: j },
			},
			{
				key: "disasterDeclarationDate" + j,
				label: "Date",
				type: "date",
				repeatable: { group: "disasterDeclaration", index: j },
			},
		);
	}
	return res as FormInputDef<DisasterEventFields>[];
}

function repeatRapidOrPreliminaryAssesments(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;

		res.push(
			{
				key: "rapidOrPreliminaryAssessmentDescription" + j,
				label: "Description",
				type: "textarea",
				uiRow: {
					label:
						"Rapid/Preliminary assessment" + ` (${j})`,
				},
				repeatable: { group: "rapidOrPreliminaryAssessment", index: j },
			},
			{
				key: "rapidOrPreliminaryAssessmentDate" + j,
				label: "Date",
				type: "date",
				repeatable: { group: "rapidOrPreliminaryAssessment", index: j },
			},
		);
	}
	return res as FormInputDef<DisasterEventFields>[];
}

function repeatPostDisasterAssesments(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;
		res.push(
			{
				key: "postDisasterAssessmentDescription" + j,
				label: "Description",
				type: "textarea",
				uiRow: {
					label:
						"Post‑disaster assessment" + ` (${j})`,
				},
				repeatable: { group: "postDisasterAssessment", index: i },
			},
			{
				key: "postDisasterAssessmentDate" + j,
				label: "Date",
				type: "date",
				repeatable: { group: "postDisasterAssessment", index: i },
			},
		);
	}
	return res as FormInputDef<DisasterEventFields>[];
}

function repeatOtherAssesments(
	n: number,
): FormInputDef<DisasterEventFields>[] {
	let res = [];
	for (let i = 0; i < n; i++) {
		let j = i + 1;
		res.push(
			{
				key: "otherAssessmentDescription" + j,
				label: "Description",
				type: "textarea",
				uiRow: {
					label:
						"Other assessment" + ` (${j})`,
				},
				repeatable: { group: "otherAssessment", index: i },
			},
			{
				key: "otherAssessmentDate" + j,
				label: "Date",
				type: "date",
				repeatable: { group: "otherAssessment", index: i },
			},
		);
	}
	return res as FormInputDef<DisasterEventFields>[];
}

export function fieldsDefCommon(
): FormInputDef<DisasterEventFields>[] {
	return [
		approvalStatusField2() as FormInputDef<DisasterEventFields>,
		{
			key: "nationalDisasterId",
			label: "National disaster ID",
			type: "text",
			uiRow: {},
		},
		...repeatOtherIds(3),
		{
			key: "nameNational",
			label: "National name",
			description: "National disaster name (if any and applicable)",
			type: "text",
			uiRow: {},
		},
		{
			key: "glide",
			label: "GLIDE number",
			type: "text",
			uiRow: {},
		},
		{
			key: "nameGlobalOrRegional",
			label: "Global/regional name",
			description: "Disaster event name in global or regional databases (if applicable)",
			type: "text",
			uiRow: {},
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
			key: "startDateLocal",
			label: "Start date in local format",
			type: "text",
			uiRow: {},
		},
		{
			key: "endDateLocal",
			label: "End date in local format",
			type: "text",
		},
		{
			key: "durationDays",
			label: "Duration (days)",
			description: "Duration (of event direct effects) - in days",
			type: "number",
			uiRow: {},
		},
		{
			// field definition
			key: "disasterDeclaration",
			label: "Disaster declaration",
			type: "enum",
			required: true,
			enumData: [
				{
					key: "unknown",
					label: "Unknown",
				},
				{
					key: "yes",
					label: "Yes",
				},
				{
					key: "no",
					label: "No",
				},
			],
			uiRow: {
				label: "Disaster declaration",
			},
		},
		...repeatDisasterDeclarations(5),
		{
			key: "hadOfficialWarningOrWeatherAdvisory",
			label: "Was there an officially issued warning and/or weather advisory?",
			type: "bool",
			uiRow: {
				label: "Official Warning",
			},
		},
		{
			key: "officialWarningAffectedAreas",
			label: "Which affected areas were covered by the warning?",
			type: "textarea",
		},

		...repeatEarlyActions(5),
		...repeatRapidOrPreliminaryAssesments(5),

		{
			key: "responseOperations",
			label: "Response operations",
			type: "textarea",
			uiRow: {},
		},

		...repeatPostDisasterAssesments(5),
		...repeatOtherAssesments(5),

		{
			key: "dataSource",
			label: "Data source",
			type: "text",
			uiRow: {
				label: "Data source",
			},
		},
		{
			key: "recordingInstitution",
			label: "Recording institution",
			type: "text",
		},
		{
			key: "effectsTotalUsd",
			label: "Effects (damages + losses) total (in monetary terms - USD)",
			type: "money",
			uiRow: {
				label: "Effects",
			},
		},
		{
			key: "nonEconomicLosses",
			label: "Non-economic losses",
			type: "textarea",
			uiRow: {},
		},
		{
			key: "damagesSubtotalLocalCurrency",
			label: "Damages (sub‑total) - in monetary terms - local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "lossesSubtotalUSD",
			label: "Losses (sub-total) - in monetary terms - USD",
			type: "money",
			uiRow: {},
		},
		{
			key: "responseOperationsDescription",
			label: "(Emergency) Response operations (description)",
			type: "textarea",
			uiRow: {},
		},
		{
			key: "responseOperationsCostsLocalCurrency",
			label: "Response operations costs (total expenditure, in local currency)",
			type: "money",
			uiRow: {},
		},
		{
			key: "responseCostTotalLocalCurrency",
			label: "(Emergency) Response cost - total - in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "responseCostTotalUSD",
			label: "(Emergency) Response cost - total - in USD",
			type: "money",
		},
		{
			key: "humanitarianNeedsDescription",
			label: "Humanitarian needs - description",
			type: "textarea",
			uiRow: {},
		},
		{
			key: "humanitarianNeedsLocalCurrency",
			label: "Humanitarian needs - total in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "humanitarianNeedsUSD",
			label: "Humanitarian needs - total in USD",
			type: "money",
		},
		{
			key: "rehabilitationCostsLocalCurrencyOverride",
			label: "Rehabilitation costs - total in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "repairCostsLocalCurrencyOverride",
			label: "Repair costs - total in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "replacementCostsLocalCurrencyOverride",
			label: "Replacement costs - total in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "recoveryNeedsLocalCurrencyOverride",
			label: "Recovery needs - total in local currency",
			type: "money",
			uiRow: {},
		},
		{
			key: "legacyData",
			label: "Legacy data",
			type: "json",
			uiRow: { colOverride: 1 },
		},
		{
			key: "attachments",
			label: "Attachments",
			type: "other",
			psqlType: "jsonb",
			uiRowNew: true,
		},
		{
			key: "spatialFootprint",
			label: "Spatial footprint",
			type: "other",
			psqlType: "jsonb",
		},
	];
}

export function fieldsDef(): FormInputDef<DisasterEventFields>[] {
	return [
		{ key: "hazardousEventId", label: "", type: "uuid" },
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazardId", label: "", type: "other", uiRow: { colOverride: 1 } },
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(),
	];
}

export function fieldsDefApi(
): FormInputDef<DisasterEventFields>[] {
	return [
		{ key: "hazardousEventId", label: "", type: "uuid" },
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazardId", label: "", type: "other" },
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(),
		{ key: "apiImportId", label: "", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

export function fieldsDefView(
): FormInputDef<DisasterEventViewModel>[] {
	return [
		{
			key: "hazardousEventId",
			label: "Hazardous event",
			type: "uuid",
		},
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazard", label: "", type: "other" },
		...fieldsDefCommon(),
		{ key: "createdAt", label: "", type: "other" },
		{ key: "updatedAt", label: "", type: "other" },
	];
}

export function disasterEventLabel(args: { id?: string }): string {
	let parts: string[] = [];
	if (args.id) {
		parts.push(args.id.slice(0, 5));
	}
	return parts.join(" ");
}

export function disasterEventLink(
	args: {
		id: string;
	},
) {
	return (
		<LangLink lang="en" to={`/disaster-event/${args.id}`}>
			{disasterEventLabel(args)}
		</LangLink>
	);
}

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	divisionGeoJSON?: any;
	hip: Hip;
	hazardousEvent?: HazardousEventPickerType | null;
	disasterEvent?: DisasterEventBasicInfoViewModel | null;
	treeData: any[];
	ctryIso3: string;
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const fields = props.fields;

	const [selectedHazardousEvent, setSelectedHazardousEvent] = useState(
		props.hazardousEvent,
	);

	const [selectedDisasterEvent, setSelectedDisasterEvent] = useState(
		props.disasterEvent,
	);
	useEffect(() => {
		const handleMessage = (event: any) => {
			console.log("got message from another window", event.data);
			if (event.data?.type == "select_hazard") {
				if (event.data?.selected) {
					setSelectedHazardousEvent(event.data.selected);
				}
			}
			if (event.data?.type == "select_disaster") {
				if (event.data?.selected) {
					setSelectedDisasterEvent(event.data.selected);
				}
			}
		};
		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	let hazardousEventLinkInitial: "none" | "hazardous_event" | "disaster_event" =
		"none";
	if (props.fields.hazardousEventId) {
		hazardousEventLinkInitial = "hazardous_event";
	} else if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event";
	}

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(
		hazardousEventLinkInitial,
	);

	let calculationOverrides: Record<string, ReactElement | undefined | null> =
		{};

	let names = ["rehabilitation", "repair", "replacement", "recovery"];
	let initialOverrides: Record<string, boolean> = {};
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs";
		let nameOverride = name + mod + "LocalCurrencyOverride";
		let valueOverride = (props.fields as any)[nameOverride] as string;
		initialOverrides[nameOverride] =
			typeof valueOverride == "string" && valueOverride != "";
	}

	let [overrides, setOverrides] = useState(initialOverrides);
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs";
		let nameOverride = name + mod + "LocalCurrencyOverride";
		let nameCalc = name + mod + "LocalCurrencyCalc";
		let valueOverride = (props.fields as any)[nameOverride] as string;
		let valueCalc = (props.fields as any)[nameCalc] as string;
		//	let value = (valueOverride !== "" && valueOverride !== null) ? valueOverride : valueCalc
		//if (value === "" || value === null) {
		//value = "0"
		//}
		let fields = fieldsDef();
		let def = fields.find((d) => d.key == nameOverride);
		if (!def) throw new Error("def not found for: " + nameOverride);

		let errors: any = null;
		if (props.errors?.fields) {
			let fe = props.errors.fields as any;
			errors = fe[nameOverride];
		}

		const handleCheckboxChange = (
			event: React.ChangeEvent<HTMLInputElement>,
		) => {
			setOverrides((prevOverrides) => ({
				...prevOverrides,
				[nameOverride]: event.target.checked,
			}));
		};

		calculationOverrides[nameOverride] = (
			<>
				<WrapInput
					def={def}
					child={
						<>
							{overrides[nameOverride] ? (
								<input
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									name={nameOverride}
									defaultValue={valueOverride}
								/>
							) : (
								<>
									<input type="hidden" name={nameOverride} value="" />
									<input type="text" disabled value={valueCalc} />
								</>
							)}
						</>
					}
					errors={errors}
				/>
				<WrapInputBasic
					label={"Override"}
					child={
						<input
							type="checkbox"
							checked={overrides[nameOverride] || false}
							onChange={handleCheckboxChange}
						></input>
					}
				/>
			</>
		);
	}

	return (
		<FormView
			user={props.user}
			path={route}
			edit={props.edit}
			id={props.id}
			title={"Disaster events"}
			editLabel={"Edit disaster event"}
			addLabel={"Add disaster event"}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef()}
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
									<option value="hazardous_event">
										{"Hazardous event"}
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
				...calculationOverrides,
				hazardousEventId:
					hazardousEventLinkType == "hazardous_event" ? (
						<Field
							key="hazardousEventId"
							label={"Hazardous event"}
						>
							{selectedHazardousEvent
								? hazardousEventLink(selectedHazardousEvent)
								: "-"}
							&nbsp;
							<LangLink
								lang="en"
								target="_blank"
								rel="opener"
								to={"/hazardous-event/picker"}
							>
								{"Change"}
							</LangLink>
							<input
								type="hidden"
								name="hazardousEventId"
								value={selectedHazardousEvent?.id || ""}
							/>
							<FieldErrors
								errors={props.errors}
								field="hazardousEventId"
							></FieldErrors>
						</Field>
					) : (
						<input type="hidden" name="hazardousEventId" value="" />
					),
				disasterEventId:
					hazardousEventLinkType == "disaster_event" ? (
						<Field
							key="disasterEventId"
							label={"Disaster event"}
						>
							{selectedDisasterEvent
								? disasterEventLink(selectedDisasterEvent)
								: "-"}
							&nbsp;
							<LangLink
								lang="en"
								target="_blank"
								rel="opener"
								to={"/disaster-event/picker"}
							>
								{"Change"}
							</LangLink>
							<input
								type="hidden"
								name="disasterEventId"
								value={selectedDisasterEvent?.id || ""}
							/>
							<FieldErrors
								errors={props.errors}
								field="disasterEventId"
							></FieldErrors>
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
				spatialFootprint: props.edit ? (
					<Field key="spatialFootprint" label="">
						<SpatialFootprintFormView
							divisions={divisionGeoJSON}
							ctryIso3={ctryIso3 || ""}
							treeData={treeData ?? []}
							initialData={props.fields?.spatialFootprint}
						/>
					</Field>
				) : (
					<Field key="spatialFootprint" label="">
						<></>
					</Field>
				),
				attachments: props.edit ? (
					<Field key="attachments" label="">
						<AttachmentsFormView
							save_path_temp={TEMP_UPLOAD_PATH}
							file_viewer_temp_url="/disaster-event/file-temp-viewer"
							file_viewer_url="/disaster-event/file-viewer"
							api_upload_url="/disaster-event/file-pre-upload"
							initialData={props?.fields?.attachments}
						/>
					</Field>
				) : (
					<Field key="attachments" label="">
						<></>
					</Field>
				),
			}}
		/>
	);
}

interface DisasterEventViewProps {
	ctx?: ViewContext;
	item: DisasterEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterEventView(props: DisasterEventViewProps) {
	const ctx = props.ctx || fallbackCtx;

	const matches = useMatches();
	// Find the route where the loader returned `env`
	const rootData = matches.find(
		(match: any) => match.id === "root", // 👈 or the actual route ID if not in root
	)?.data as { env?: { DTS_INSTANCE_CTRY_ISO3?: string } };
	const ctryIso3 = rootData?.env?.DTS_INSTANCE_CTRY_ISO3;

	const { item, auditLogs } = props;

	let calculationOverrides: Record<string, ReactElement | undefined | null> =
		{};

	const messages = [
		"Rehabilitation costs",
		"Repair costs",
		"Replacement costs",
		"Recovery needs",
	];

	const messagesWithLocalCurrency = messages.map(() =>
		"{label} local currency",
	);

	let names = ["rehabilitation", "repair", "replacement", "recovery"];
	for (let i = 0; i < names.length; i++) {
		let name = names[i];
		let mod = name != "recovery" ? "Costs" : "Needs";
		let nameOverride = name + mod + "LocalCurrencyOverride";
		let nameCalc = name + mod + "LocalCurrencyCalc";
		let valueOverride = (props.item as any)[nameOverride] as string;
		let valueCalc = (props.item as any)[nameCalc] as string;
		let value =
			valueOverride !== "" && valueOverride !== null
				? valueOverride
				: valueCalc;
		if (value === "" || value === null) {
			value = "0";
		}
		calculationOverrides[nameOverride] = (
			<p key={nameOverride}>
				{messagesWithLocalCurrency[i]}: {value}
			</p>
		);
	}

	let override = {
		...calculationOverrides,
		hazardousEventId: item.hazardousEvent && (
			<p key="hazardousEventId">
				{"Hazardous event"}
				: {hazardousEventLink(item.hazardousEvent)}
			</p>
		),
		disasterEventId: item.disasterEvent && (
			<p key="disasterEventId">
				{"Disaster event"}
				: {disasterEventLink(item.disasterEvent)}
			</p>
		),
		hipHazard: <HipHazardInfo key="hazard" model={item} />,
		createdAt: (
			<p key="createdAt">
				{"Created at"}
				: {formatDate(item.createdAt)}
			</p>
		),
		updatedAt: (
			<p key="updatedAt">
				{"Updated at"}
				: {formatDate(item.updatedAt)}
			</p>
		),
		spatialFootprint: (
			<SpatialFootprintView
				initialData={(item?.spatialFootprint as any[]) || []}
				mapViewerOption={2}
				mapViewerDataSources={
					((item as any)?.spatialFootprintsDataSource as any[]) || []
				}
				ctryIso3={ctryIso3}
			/>
		),
		attachments: (
			<AttachmentsView
				id={item.id}
				initialData={(item?.attachments as any[]) || []}
				file_viewer_url="/disaster-event/file-viewer"
			/>
		),
	};

	return (
		<ViewComponent
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			title={"Disaster events"}
		>
			<FieldsView
				def={fieldsDefView()}
				fields={item}
				override={override}
				user={ctx.user || undefined}
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

