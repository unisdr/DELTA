import {
	useMatches
} from "@remix-run/react";

import { useEffect, useState, ReactElement } from 'react';

import { DisasterEventFields, DisasterEventViewModel, HazardousEventBasicInfoViewModel, DisasterEventBasicInfoViewModel } from "~/backend.server/models/event"

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
import { capitalizeFirstLetter } from "~/util/string";


import { SpatialFootprintFormView } from '~/frontend/spatialFootprintFormView';
import { SpatialFootprintView } from '~/frontend/spatialFootprintView';
import { AttachmentsFormView } from "~/frontend/attachmentsFormView";
import { AttachmentsView } from "~/frontend/attachmentsView";
import { TEMP_UPLOAD_PATH } from "~/utils/paths";
import { ViewContext } from "../context";
import { DContext } from "~/util/dcontext";

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
						"msg": "Early Action"
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
				"msg": "National Disaster ID"
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
				"msg": "GLIDE Number"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "nameGlobalOrRegional",
			label: ctx.t({
				"code": "disaster_event.global_regional_name",
				"msg": "Global/Regional Name"
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
				"msg": "Start Date"
			}),
			type: "date_optional_precision",
			uiRow: {}
		},
		{
			key: "endDate",
			label: ctx.t({
				"code": "common.end_date",
				"msg": "End Date"
			}),
			type: "date_optional_precision"
		},
		{
			key: "startDateLocal",
			label: ctx.t({
				"code": "disaster_event.start_date_local",
				"msg": "Start Date in local format"
			}),
			type: "text",
			uiRow: {}
		},
		{
			key: "endDateLocal",
			label: ctx.t({
				"code": "disaster_event.end_date_local",
				"msg": "End Date in local format"
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
				"msg": "Response Operations"
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
				"msg": "Non-Economic losses"
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
				"msg": "Legacy Data"
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
				"msg": "Spatial Footprint"
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
		...fieldsDefCommon(ctx),
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
	hazardousEvent?: HazardousEventBasicInfoViewModel | null
	disasterEvent?: DisasterEventBasicInfoViewModel | null
	treeData: any[];
	ctryIso3: string;
}

export function DisasterEventForm(props: DisasterEventFormProps) {
	const ctx = props.ctx;
	const fields = props.fields;

	const [selectedHazardousEvent, setSelectedHazardousEvent] = useState(props.hazardousEvent);

	const [selectedDisasterEvent, setSelectedDisasterEvent] = useState(props.disasterEvent);
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
	}, []);

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

	return (
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
	)
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

	let names = ["rehabilitation", "repair", "replacement", "recovery"]
	for (let name of names) {
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
			<p key={nameOverride}>{capitalizeFirstLetter(name)} {mod} Local Currency: {value}</p>
		)
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
			<p key="createdAt">Created at: {formatDate(item.createdAt)}</p>
		),
		updatedAt: (
			<p key="updatedAt">Updated at: {formatDate(item.updatedAt)}</p>
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

			{/* Add Audit Log History at the end */}
			<br />
			{
				auditLogs && auditLogs.length > 0 && (
					<>
						<h3>{ctx.t({
							"code": "audit_log_history",
							"msg": "Audit Log History"
						})}</h3>
						<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
					</>
				)
			}
		</ViewComponent >
	);
}




