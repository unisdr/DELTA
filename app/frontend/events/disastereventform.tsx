import { useMatches } from "react-router";

import { useEffect, useState, ReactElement, useRef } from 'react';

import { DisasterEventFields, DisasterEventViewModel, DisasterEventBasicInfoViewModel } from "~/backend.server/models/event"

import { hazardousEventLink } from "~/frontend/events/hazardeventform"


import { LangLink } from "~/util/link";


import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	ViewComponent,
	FormView,
	FieldErrors,
	Field,
	WrapInputBasic,
	WrapInput
} from "~/frontend/form";
import { approvalStatusField2 } from "../approval";
import { formatDate } from "~/util/date";
import AuditLogHistory from "~/components/AuditLogHistory";
import { HazardPicker, Hip } from "~/frontend/hip/hazardpicker";
import { HipHazardInfo } from "~/frontend/hip/hip";


import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "../context";
import { DContext } from "~/util/dcontext";
import { HazardousEventPickerType } from "~/routes/$lang+/hazardous-event+/picker";

import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from "primereact/checkbox";

export const route = "/disaster-event"

function repeatOtherIds(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		res.push(
			{
				key: "otherId" + (i + 1),
				label: ctx.t({
					"code": "disaster_event.other_id",
					"msg": "Event ID in other system"
				}) + ` (${i + 1})`,
				type: "text",
				uiRow: i == 0 ? {} : undefined,
				repeatable: { "group": "otherId", index: i }
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatEarlyActions(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		res.push(
			{
				key: `earlyActionDescription` + (i + 1),
				label: ctx.t({
					"code": "common.description",
					"msg": "Description"
				}),
				type: "textarea",
				uiRow: {
					label: ctx.t({
						"code": "disaster_event.early_action",
						"msg": "Early action"
					}) + ` (${i + 1})`,
				},
				repeatable: { "group": "earlyAction", "index": i }
			},
			{
				key: `earlyActionDate` + (i + 1),
				label: ctx.t({
					"code": "common.date",
					"msg": "Date"
				}),
				type: "date",
				repeatable: { "group": "earlyAction", "index": i }
			}
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatDisasterDeclarations(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "disasterDeclarationTypeAndEffect" + j,
				label: ctx.t({
					"code": "disaster_event.disaster_declaration_type_and_effect",
					"desc": "Label for type and effect field in disaster declaration",
					"msg": "Type and Effect"
				}),
				type: "textarea",
				uiRow: {
					label: ctx.t({
						"code": "disaster_event.disaster_declaration",
						"msg": "Disaster declaration"
					}) + ` (${j})`
				},
				repeatable: { "group": "disasterDeclaration", "index": j }
			},
			{
				key: "disasterDeclarationDate" + j,
				label: ctx.t({
					"code": "common.date",
					"msg": "Date"
				}),
				type: "date",
				repeatable: { "group": "disasterDeclaration", "index": j }
			}
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatRapidOrPreliminaryAssesments(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {

		let j = i + 1

		res.push(
			{
				key: "rapidOrPreliminaryAssessmentDescription" + j,
				label: ctx.t({
					"code": "common.description",
					"msg": "Description"
				}),
				type: "textarea",
				uiRow: {
					label: ctx.t({
						"code": "disaster_event.rapid_preliminary_assessment",
						"msg": "Rapid/Preliminary assessment"
					}) + ` (${j})`
				},
				repeatable: { "group": "rapidOrPreliminaryAssessment", "index": j }
			},
			{
				key: "rapidOrPreliminaryAssessmentDate" + j,
				label: ctx.t({
					"code": "common.date",
					"msg": "Date"
				}),
				type: "date",
				repeatable: { "group": "rapidOrPreliminaryAssessment", "index": j }
			}

		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatPostDisasterAssesments(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "postDisasterAssessmentDescription" + j,
				label: ctx.t({
					"code": "common.description",
					"msg": "Description"
				}),
				type: "textarea",
				uiRow: {
					label:
						ctx.t({
							"code": "disaster_event.post_disaster_assessment",
							"msg": "Post‑disaster assessment"
						}) + ` (${j})`
				},
				repeatable: { group: "postDisasterAssessment", index: i }
			},
			{
				key: "postDisasterAssessmentDate" + j,
				label: ctx.t({
					"code": "common.date",
					"msg": "Date"
				}),
				type: "date",
				repeatable: { group: "postDisasterAssessment", index: i }
			}
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}

function repeatOtherAssesments(ctx: DContext, n: number): FormInputDef<DisasterEventFields>[] {
	let res = []
	for (let i = 0; i < n; i++) {
		let j = i + 1
		res.push(
			{
				key: "otherAssessmentDescription" + j,
				label: ctx.t({
					"code": "common.description",
					"msg": "Description"
				}),
				type: "textarea",
				uiRow: {
					label:
						ctx.t({
							"code": "disaster_event.other_assessment",
							"msg": "Other assessment"
						}) + ` (${j})`
				},
				repeatable: { group: "otherAssessment", index: i }
			},
			{
				key: "otherAssessmentDate" + j,
				label: ctx.t({
					"code": "common.date",
					"msg": "Date"
				}),
				type: "date",
				repeatable: { group: "otherAssessment", index: i }
			},
		)
	}
	return res as FormInputDef<DisasterEventFields>[]
}


export function fieldsDefCommon(ctx: DContext): FormInputDef<DisasterEventFields>[] {
	return [
		approvalStatusField2(ctx) as FormInputDef<DisasterEventFields>,
		{
			key: "nationalDisasterId",
			label: ctx.t({
				"code": "disaster_event.national_disaster_id",
				"msg": "National disaster ID"
			}),
			type: "text",
			uiRow: {}
		},
		...repeatOtherIds(ctx, 3),
		{
			key: "nameNational",
			label: ctx.t({
				"code": "disaster_event.national_name",
				"desc": "National name for disaster event",
				"msg": "National name"
			}),
			description: ctx.t({
				"code": "disaster_event.national_name_description",
				"desc": "National name for disaster event",
				"msg": "National disaster name (if any and applicable)"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "glide",
			label: ctx.t({
				"code": "disaster_event.glide_number",
				"desc": "GLIDE number is a type of ID",
				"msg": "GLIDE number"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "nameGlobalOrRegional",
			label: ctx.t({
				"code": "disaster_event.global_regional_name",
				"msg": "Global/regional name"
			}),
			description: ctx.t({
				"code": "disaster_event.global_regional_name_description",
				"msg": "Disaster event name in global or regional databases (if applicable)"
			}),
			type: "text",
			uiRow: {}
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
			key: "startDateLocal",
			label: ctx.t({
				"code": "disaster_event.start_date_local",
				"msg": "Start date in local format"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "endDateLocal",
			label: ctx.t({
				"code": "disaster_event.end_date_local",
				"msg": "End date in local format"
			}),
			type: "text"
		},
		{
			key: "durationDays",
			label: ctx.t({
				"code": "disaster_event.duration_days",
				"msg": "Duration (days)"
			}),
			description: ctx.t({
				"code": "disaster_event.duration_days_description",
				"msg": "Duration (of event direct effects) - in days"
			}),
			type: "number",
			uiRow: {}
		},
		{
			// field definition
			key: "disasterDeclaration",
			label: ctx.t({
				"code": "disaster_event.disaster_declaration",
				"msg": "Disaster declaration"
			}),
			type: "enum",
			required: true,
			enumData: [
				{
					key: "unknown",
					label: ctx.t({
						"code": "common.unknown",
						"msg": "Unknown"
					})
				},
				{
					key: "yes",
					label: ctx.t({
						"code": "common.yes",
						"desc": "Yes (true)",
						"msg": "Yes"
					})
				},
				{
					key: "no",
					label: ctx.t({
						"code": "common.no",
						"desc": "No (false)",
						"msg": "No"
					})
				}
			],
			uiRow: {
				label: ctx.t({
					"code": "disaster_event.disaster_declaration",
					"msg": "Disaster declaration"
				})
			},
		},
		...repeatDisasterDeclarations(ctx, 5),
		{
			key: "hadOfficialWarningOrWeatherAdvisory",
			label: ctx.t({
				"code": "disaster_event.had_official_warning_or_weather_advisory",
				"desc": "Label for the warning/advisory boolean field",
				"msg": "Was there an officially issued warning and/or weather advisory?"
			}),
			type: "bool",
			uiRow: {
				label: ctx.t({
					"code": "common.official_warning",
					"desc": "Row label for official warning data",
					"msg": "Official Warning"
				})
			}
		},
		{
			key: "officialWarningAffectedAreas",
			label: ctx.t({
				"code": "disaster_event.official_warning_affected_areas",
				"desc": "Label for textarea listing areas covered by the warning",
				"msg": "Which affected areas were covered by the warning?"
			}),
			type: "textarea"
		},

		...repeatEarlyActions(ctx, 5),
		...repeatRapidOrPreliminaryAssesments(ctx, 5),

		{
			key: "responseOperations",
			label: ctx.t({
				"code": "disaster_event.response_operations",
				"msg": "Response operations"
			}),
			type: "textarea",
			uiRow: {}
		},

		...repeatPostDisasterAssesments(ctx, 5),
		...repeatOtherAssesments(ctx, 5),

		{
			key: "dataSource",
			label: ctx.t({
				"code": "common.data_source",
				"msg": "Data source"
			}),
			type: "text",
			uiRow: {
				label: ctx.t({
					"code": "common.data_source",
					"msg": "Data source"
				})
			},
		},
		{
			key: "recordingInstitution",
			label: ctx.t({
				"code": "disaster_event.recording_institution",
				"msg": "Recording institution"
			}),
			type: "text"
		},
		{
			key: "effectsTotalUsd",
			label: ctx.t({
				"code": "disaster_event.effects_total_usd",
				"desc": "Label for total monetary effects (damages + losses) in USD",
				"msg": "Effects (damages + losses) total (in monetary terms - USD)"
			}),
			type: "money",
			uiRow: {
				label: ctx.t({
					"code": "disaster_event.effects",
					"msg": "Effects"
				})
			},
		},
		{
			key: "nonEconomicLosses",
			label: ctx.t({
				"code": "disaster_event.non_economic_losses",
				"msg": "Non-economic losses"
			}),
			type: "textarea",
			uiRow: {}
		},
		{
			key: "damagesSubtotalLocalCurrency",
			label: ctx.t({
				"code": "disaster_event.damages_subtotal_local_currency",
				"desc": "Label for damages sub‑total in local currency",
				"msg": "Damages (sub‑total) - in monetary terms - local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "lossesSubtotalUSD",
			label: ctx.t({
				"code": "disaster_event.losses_subtotal_usd",
				"desc": "Label for losses sub‑total in USD",
				"msg": "Losses (sub-total) - in monetary terms - USD"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "responseOperationsDescription",
			label: ctx.t({
				"code": "disaster_event.response_operations_description",
				"desc": "Label for response operations description field",
				"msg": "(Emergency) Response operations (description)"
			}),
			type: "textarea",
			uiRow: {}
		},
		{
			key: "responseOperationsCostsLocalCurrency",
			label: ctx.t({
				"code": "disaster_event.response_operations_costs_local_currency",
				"msg": "Response operations costs (total expenditure, in local currency)"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "responseCostTotalLocalCurrency",
			label: ctx.t({
				"code": "disaster_event.response_cost_total_local_currency",
				"desc": "Label for emergency response cost total in local currency",
				"msg": "(Emergency) Response cost - total - in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "responseCostTotalUSD",
			label: ctx.t({
				"code": "disaster_event.response_cost_total_usd",
				"desc": "Label for emergency response cost total in USD",
				"msg": "(Emergency) Response cost - total - in USD"
			}),
			type: "money"
		},
		{
			key: "humanitarianNeedsDescription",
			label: ctx.t({
				"code": "disaster_event.humanitarian_needs_description",
				"msg": "Humanitarian needs - description"
			}),
			type: "textarea",
			uiRow: {}
		},
		{
			key: "humanitarianNeedsLocalCurrency",
			label: ctx.t({
				"code": "disaster_event.humanitarian_needs_local_currency",
				"msg": "Humanitarian needs - total in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "humanitarianNeedsUSD",
			label: ctx.t({
				"code": "disaster_event.humanitarian_needs_usd",
				"msg": "Humanitarian needs - total in USD"
			}),
			type: "money"
		},
		{
			key: "rehabilitationCostsLocalCurrencyOverride",
			label: ctx.t({
				"code": "disaster_event.rehabilitation_costs_local_currency_override",
				"msg": "Rehabilitation costs - total in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "repairCostsLocalCurrencyOverride",
			label: ctx.t({
				"code": "disaster_event.repair_costs_local_currency_override",
				"msg": "Repair costs - total in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "replacementCostsLocalCurrencyOverride",
			label: ctx.t({
				"code": "disaster_event.replacement_costs_local_currency_override",
				"msg": "Replacement costs - total in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "recoveryNeedsLocalCurrencyOverride",
			label: ctx.t({
				"code": "disaster_event.recovery_needs_local_currency_override",
				"msg": "Recovery needs - total in local currency"
			}),
			type: "money",
			uiRow: {}
		},
		{
			key: "legacyData",
			label: ctx.t({
				"code": "common.legacy_data",
				"msg": "Legacy data"
			}),
			type: "json",
			uiRow: { colOverride: 1 },
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
			key: "spatialFootprint",
			label: ctx.t({
				"code": "spatial_footprint",
				"msg": "Spatial footprint"
			}),
			type: "other",
			psqlType: "jsonb"
		},
	];
}

export function fieldsDef(ctx: DContext): FormInputDef<DisasterEventFields>[] {
	return [
		{ key: "hazardousEventId", label: "", type: "uuid" },
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazardId", label: "", type: "other", uiRow: { colOverride: 1 } },
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(ctx)
	];
}

export function fieldsDefApi(ctx: DContext): FormInputDef<DisasterEventFields>[] {
	return [
		{ key: "hazardousEventId", label: "", type: "uuid" },
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazardId", label: "", type: "other" },
		{ key: "hipClusterId", label: "", type: "other" },
		{ key: "hipTypeId", label: "", type: "other" },
		...fieldsDefCommon(ctx),
		{ key: "apiImportId", label: "", type: "other" },
		{ key: "countryAccountsId", label: "", type: "other" },
	];
}

export function fieldsDefView(ctx: DContext): FormInputDef<DisasterEventViewModel>[] {
	return [
		{
			key: "hazardousEventId",
			label: ctx.t({
				"code": "hazardous_event",
				"msg": "Hazardous event"
			}),
			type: "uuid"
		},
		{ key: "disasterEventId", label: "", type: "uuid" },
		{ key: "hipHazard", label: "", type: "other" },
		...(fieldsDefCommon(ctx) as FormInputDef<DisasterEventViewModel>[]),
		{ key: "createdAt", label: "", type: "other" },
		{ key: "updatedAt", label: "", type: "other" },
	];
}

export function disasterEventLabel(args: {
	id?: string;
}): string {
	let parts: string[] = []
	if (args.id) {
		parts.push(args.id.slice(0, 5))
	}
	return parts.join(" ")
}

export function disasterEventLink(ctx: ViewContext, args: {
	id: string;
}) {
	return <LangLink lang={ctx.lang} to={`/disaster-event/${args.id}`}>
		{disasterEventLabel(args)}
	</LangLink>
}

interface DisasterEventFormProps extends UserFormProps<DisasterEventFields> {
	divisionGeoJSON?: any;
	hip: Hip;
	hazardousEvent?: HazardousEventPickerType | null
	disasterEvent?: DisasterEventBasicInfoViewModel | null
	treeData: any[];
	ctryIso3: string;
	usersWithValidatorRole?: any[];
}

interface UserValidator {
	name: string;
	id: string;
	email: string;
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const ctx = props.ctx;
	const fields = props.fields;

	const [selectedHazardousEvent, setSelectedHazardousEvent] = useState(props.hazardousEvent);

	const [selectedDisasterEvent, setSelectedDisasterEvent] = useState(props.disasterEvent);
	// const [selected, setSelected] = useState(props.parent);
	const [selectedUserValidator, setSelectedUserValidator] = useState<UserValidator | null>(null);
	const [selectedAction, setSelectedAction] = useState<string>("submit-draft");
	const [checked, setChecked] = useState(false);
	const actionLabels: Record<string, string> = {
		"submit-validate": ctx.t({ "code": "common.validate_record", "msg":"Validate record"}),
		"submit-publish": ctx.t({ "code": "common.validate_and_publish_record", "msg":"Validate and publish record"}),
		"submit-draft": ctx.t({"code": "common.save_draft", "msg": "Save as draft"}),
		"submit-validation": ctx.t({"code": "common.submit_for_validation", "msg": "Submit for validation"}),
	};

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
				// display: "none"
			}}
		>
			{ctx.t({
				"code": "common.savesubmit",
				"desc": "Label for save submit action",
				"msg": "Save or submit"
			})}
		</button>
		<button type="button" className="mg-button mg-button-system"
			onClick={(e: any) => {
				e.preventDefault();
				setVisibleModalDiscard(true);
			}}
			style={{
				// display: "none"
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
			console.log("got message from another window", event.data)
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
		window.addEventListener('message', handleMessage);
		return () => {
			window.removeEventListener('message', handleMessage);
		};
	}, [props.id]);

	const treeData = props.treeData;
	const ctryIso3 = props.ctryIso3;
	const divisionGeoJSON = props.divisionGeoJSON;

	let hazardousEventLinkInitial: "none" | "hazardous_event" | "disaster_event" = "none"
	if (props.fields.hazardousEventId) {
		hazardousEventLinkInitial = "hazardous_event"
	} else if (props.fields.disasterEventId) {
		hazardousEventLinkInitial = "disaster_event"
	}

	const [hazardousEventLinkType, setHazardousEventLinkType] = useState(hazardousEventLinkInitial)

	let calculationOverrides: Record<string, ReactElement | undefined | null> = {}

	let names = ["rehabilitation", "repair", "replacement", "recovery"]
	let initialOverrides: Record<string, boolean> = {}
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let valueOverride = (props.fields as any)[nameOverride] as string
		initialOverrides[nameOverride] = typeof valueOverride == "string" && valueOverride != ""
	}

	let [overrides, setOverrides] = useState(initialOverrides)
	for (let name of names) {
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let nameCalc = name + mod + "LocalCurrencyCalc"
		let valueOverride = (props.fields as any)[nameOverride] as string
		let valueCalc = (props.fields as any)[nameCalc] as string
		//	let value = (valueOverride !== "" && valueOverride !== null) ? valueOverride : valueCalc
		//if (value === "" || value === null) {
		//value = "0"
		//}
		let fields = fieldsDef(ctx)
		let def = fields.find((d) => d.key == nameOverride)
		if (!def) throw new Error("def not found for: " + nameOverride)

		let errors: any = null
		if (props.errors?.fields) {
			let fe = props.errors.fields as any
			errors = fe[nameOverride]
		}

		const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
			setOverrides((prevOverrides) => ({ ...prevOverrides, [nameOverride]: event.target.checked }));
		}

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
					label={ctx.t({
						"code": "common.override_input",
						"desc": "Label for checkbox that allows inputing manual calculation (overriding) instead of using auto calculated ones",
						"msg": "Override"
					})}
					child={
						<input type="checkbox" checked={overrides[nameOverride] || false} onChange={handleCheckboxChange}></input>
					} />
			</>
		)
	}

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
			// Extract just the IDs and join them as comma-separated string
			const validatorIds = Array.isArray(selectedUserValidator)
				? selectedUserValidator.map((c) => c.id).join(",")
				: selectedUserValidator?.id || ""

			//const validatorField = document.getElementById("tableValidatorUserIds") as HTMLInputElement;
			if (tempValidatorField) {
				tempValidatorField.value = validatorIds;
			}

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
				label={actionLabels[selectedAction] || ctx.t({ "code": "common.save_draft", "msg":"Save as draft"})}
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
											onChange={() => {
												setChecked(false);
												setSelectedAction('submit-draft');
											}}
										/>
									</div>
								</label>
							</div>
							<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
								<span>{ctx.t({"code": "common.save_draft", "msg": "Save as draft"})}</span>
								<span style={{ color: "#aaa" }}>{ctx.t({"code": "common.store_for_future_editing", "msg": "Store this entry for future editing"})}</span>
							</div>
						</li>
						{ 
							// this block only appears for admin users - start block
							ctx.user?.role == 'admin' && (<>
								<li className="dts-attachments__item" style={{ justifyContent: "left" }}>
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
													checked={selectedAction === 'submit-validate' || selectedAction === 'submit-publish'}
													onChange={() => {
														setSelectedAction('submit-validate');
													}}
												/>
											</div>
										</label>
									</div>
									<div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
										<span>
											{ctx.t({"code": "common.validate", "msg": "Validate"})}
										</span>
										<span style={{ color: "#999" }}>{ctx.t({"code": "common.validate_description", "msg": "This indicates that the event has been checked for accuracy."})}</span>

										<div style={{ display: "block" }}>
											<div style={{ width: "40px", marginTop: "10px", float: "left" }}>
												<Checkbox
													id="publish-checkbox"
													name="publish-checkbox"
													value="submit-publish"
													onChange={e => {
														if (e.checked === undefined) return;
														else if (!e.checked) {
															setSelectedAction('submit-validate');
															setChecked(false);
														}
														else {
															setChecked(true);
															setSelectedAction('submit-publish');
														}

													}}
													checked={checked}></Checkbox>
											</div>
											<div style={{ marginLeft: "20px", marginTop: "10px" }}>
												<div>{ctx.t({"code": "common.publish_undrr_instance", "msg": "Publish to UNDRR instance"})}</div>

												<span style={{ color: "#999" }}>
													{ctx.t({"code": "common.publish_undrr_instance_description", "msg": "Data from this event will be made publicly available."})}
												</span>
											</div>
										</div>
									</div>
								</li>
							</>)
							// this block only appears for admin users - end block
						}

						{ 
							// this block only appears for data-collector and data-validator users - start block
							(ctx.user?.role == 'data-validator' || ctx.user?.role == 'data-collector') && (<>
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
													onChange={() => {
														setChecked(false);
														setSelectedAction('submit-validation');
													}}
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
							</>)
							// this block only appears for data-collector and data-validator users - end block
						}
						
						

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
			title={ctx.t({
				"code": "disaster_events",
				"msg": "Disaster events"
			})}
			editLabel={ctx.t({
				"code": "disaster_event.edit",
				"msg": "Edit disaster event"
			})}
			addLabel={ctx.t({
				"code": "disaster_event.add",
				"msg": "Add disaster event"
			})}
			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef(ctx)}
			infoNodes={<>
				<div className="mg-grid mg-grid__col-3">
					<WrapInputBasic
						label={ctx.t({
							"code": "disaster_event.linking_parameter",
							"msg": "Linking parameter"
						})}
						child={
							<select defaultValue={hazardousEventLinkType} onChange={(e: any) => setHazardousEventLinkType(e.target.value)}>
								<option value="none">
									{ctx.t({
										"code": "common.no_link",
										"desc": "No link between records",
										"msg": "No link"
									})}
								</option>
								<option value="hazardous_event">
									{ctx.t({
										"code": "hazardous_event",
										"msg": "Hazardous event"
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
			</>
			}
			overrideSubmitMainForm={overrideSubmitButton}
			override={{
				...calculationOverrides,
				hazardousEventId:
					(hazardousEventLinkType == "hazardous_event") ?
						<Field
							key="hazardousEventId"
							label={ctx.t({
								"code": "hazardous_event",
								"msg": "Hazardous event"
							})}
						>
							{selectedHazardousEvent ? hazardousEventLink(ctx, selectedHazardousEvent) : "-"}&nbsp;
							<LangLink lang={ctx.lang} target="_blank" rel="opener" to={"/hazardous-event/picker"}>
								{ctx.t({
									"code": "common.change",
									"msg": "Change"
								})}
							</LangLink>
							<input type="hidden" name="hazardousEventId" value={selectedHazardousEvent?.id || ""} />
							<FieldErrors errors={props.errors} field="hazardousEventId"></FieldErrors>
						</Field> : <input type="hidden" name="hazardousEventId" value="" />
				,
				disasterEventId:
					(hazardousEventLinkType == "disaster_event") ?
						<Field
							key="disasterEventId"
							label={ctx.t({
								"code": "disaster_event",
								"msg": "Disaster event"
							})}
						>
							{selectedDisasterEvent ? disasterEventLink(ctx, selectedDisasterEvent) : "-"}&nbsp;
							<LangLink lang={ctx.lang} target="_blank" rel="opener" to={"/disaster-event/picker"}>
								{ctx.t({
									"code": "common.change",
									"msg": "Change"
								})}
							</LangLink>
							<input type="hidden" name="disasterEventId" value={selectedDisasterEvent?.id || ""} />
							<FieldErrors errors={props.errors} field="disasterEventId"></FieldErrors>
						</Field> : <input type="hidden" name="disasterEventId" value="" />
				,
				hipTypeId: null,
				hipClusterId: null,
				hipHazardId: (
					<Field key="hazardId"
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
				spatialFootprint: props.edit ? (
					<Field key="spatialFootprint" label="">
						<SpatialFootprintFormView
							ctx={ctx}
							divisions={divisionGeoJSON}
							ctryIso3={ctryIso3 || ""}
							treeData={treeData ?? []}
							initialData={props.fields?.spatialFootprint}
						/>
					</Field>
				) : (
					<Field key="spatialFootprint" label=""><></></Field>
				),
				attachments: props.edit ? (
					<Field key="attachments" label="">
						<AttachmentsFormView
							ctx={ctx}
							save_path_temp={TEMP_UPLOAD_PATH}
							file_viewer_temp_url="/disaster-event/file-temp-viewer"
							file_viewer_url="/disaster-event/file-viewer"
							api_upload_url="/disaster-event/file-pre-upload"
							initialData={props?.fields?.attachments}
						/>
					</Field>
				) : (
					<Field key="attachments" label=""><></></Field>
				),
			}} />
	</>)
}

interface DisasterEventViewProps {
	ctx: ViewContext;
	item: DisasterEventViewModel;
	isPublic: boolean;
	auditLogs?: any[];
}

export function DisasterEventView(props: DisasterEventViewProps) {
	const ctx = props.ctx;

	const matches = useMatches();
	// Find the route where the loader returned `env`
	const rootData = matches.find((match: any) =>
		match.id === "root" // 👈 or the actual route ID if not in root
	)?.data as { env?: { DTS_INSTANCE_CTRY_ISO3?: string } };
	const ctryIso3 = rootData?.env?.DTS_INSTANCE_CTRY_ISO3;

	const { item, auditLogs } = props;

	let calculationOverrides: Record<string, ReactElement | undefined | null> = {}

	const messages = [
		ctx.t({
			"code": "disaster_events.rehabilitation_costs",
			"msg": "Rehabilitation costs"
		}),
		ctx.t({
			"code": "disaster_events.repair_costs",
			"msg": "Repair costs"
		}),
		ctx.t({
			"code": "disaster_events.replacement_costs",
			"msg": "Replacement costs"
		}),
		ctx.t({
			"code": "disaster_events.recovery_needs",
			"msg": "Recovery needs"
		}),
	];

	const messagesWithLocalCurrency = messages.map(label =>
		ctx.t({
			"code": "common.with_local_currency",
			"msg": "{label} local currency"
		}, { label })
	);

	let names = ["rehabilitation", "repair", "replacement", "recovery"]
	for (let i = 0; i < names.length; i++) {
		let name = names[i];
		let mod = name != "recovery" ? "Costs" : "Needs"
		let nameOverride = name + mod + "LocalCurrencyOverride"
		let nameCalc = name + mod + "LocalCurrencyCalc"
		let valueOverride = (props.item as any)[nameOverride] as string
		let valueCalc = (props.item as any)[nameCalc] as string
		let value = (valueOverride !== "" && valueOverride !== null) ? valueOverride : valueCalc
		if (value === "" || value === null) {
			value = "0"
		}
		calculationOverrides[nameOverride] = (
			<p key={nameOverride}>
				{messagesWithLocalCurrency[i]}: {value}
			</p>
		);
	}

	let override = {
		...calculationOverrides,
		hazardousEventId: (
			item.hazardousEvent &&
			<p key="hazardousEventId">
				{ctx.t({
					"code": "hazardous_event",
					"msg": "Hazardous event"
				})}: {hazardousEventLink(ctx, item.hazardousEvent)}
			</p>
		),
		disasterEventId: (
			item.disasterEvent && <p key="disasterEventId">
				{ctx.t({
					"code": "disaster_event",
					"msg": "Disaster event"
				})}: {disasterEventLink(ctx, item.disasterEvent)}
			</p>
		),
		hipHazard: (
			<HipHazardInfo ctx={ctx} key="hazard" model={item} />
		),
		createdAt: (
			<p key="createdAt">
				{ctx.t({
					"code": "common.created_at",
					"msg": "Created at"
				})}: {formatDate(item.createdAt)}
			</p>
		),
		updatedAt: (
			<p key="updatedAt">
				{ctx.t({
					"code": "common.updated_at",
					"msg": "Updated at"
				})}: {formatDate(item.updatedAt)}
			</p>
		),
		spatialFootprint: (
			<SpatialFootprintView
				ctx={ctx}
				initialData={(item?.spatialFootprint as any[]) || []}
				mapViewerOption={2}
				mapViewerDataSources={((item as any)?.spatialFootprintsDataSource as any[]) || []}
				ctryIso3={ctryIso3}
			/>
		),
		attachments: (
			<AttachmentsView
				ctx={ctx}
				id={item.id}
				initialData={(item?.attachments as any[]) || []}
				file_viewer_url="/disaster-event/file-viewer"
			/>
		),
	}

	return (
		<ViewComponent
			ctx={props.ctx}
			isPublic={props.isPublic}
			path={route}
			id={item.id}
			title={ctx.t({
				"code": "disaster_events",
				"msg": "Disaster events"
			})}
		>
			<FieldsView def={fieldsDefView(ctx)} fields={item} override={override} user={ctx.user || undefined} />

			{/* Add Audit log history at the end */}
			<br />
			{
				auditLogs && auditLogs.length > 0 && (
					<>
						<h3>{ctx.t({
							"code": "audit_log_history",
							"msg": "Audit log history"
						})}</h3>
						<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
					</>
				)
			}
		</ViewComponent >
	);
}




