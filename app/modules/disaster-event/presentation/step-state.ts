import type { DisasterEventWriteModel } from "~/modules/disaster-event/domain/entities/disaster-event";

export type StartDatePrecision = "fullDate" | "monthYear" | "yearOnly";

export interface CoreEventStepState {
	nationalDisasterId: string;
	nameNational: string;
	glide: string;
	nameGlobalOrRegional: string;
	hipHazardId: string;
	hipClusterId: string;
	hipTypeId: string;
	startDate: string;
	endDate: string;
	startDatePrecision: StartDatePrecision;
	endDatePrecision: StartDatePrecision;
	recordingInstitution: string;
	approvalStatus:
		| "draft"
		| "waiting-for-validation"
		| "needs-revision"
		| "validated"
		| "published";
}

export interface GeographyStepState {
	source: "manual" | "derived_from_division";
	divisionId: string;
	geomGeoJson: string;
}

export interface DisasterCausalityStepState {
	causeDisasterId: string;
	direction: "TRIGGERING" | "TRIGGERED";
}

export interface DisasterHazardousCausalityStepState {
	hazardousEventId: string;
	causeType: "DE_CAUSE_HE" | "HE_CAUSE_DE";
}

export interface ResponseStepState {
	responseTypeId: string;
	responseDate: string;
	description: string;
}

export interface AssessmentStepState {
	assessmentTypeId: string;
	assessmentDate: string;
	description: string;
}

export interface DeclarationStepState {
	declarationDate: string;
	description: string;
}

export interface DisasterEventStepState {
	coreEvent: CoreEventStepState;
	geography: GeographyStepState;
	causedByDisasters: DisasterCausalityStepState[];
	hazardousCausalities: DisasterHazardousCausalityStepState[];
	responses: ResponseStepState[];
	assessments: AssessmentStepState[];
	declarations: DeclarationStepState[];
}

export function makeEmptyDisasterEventStepState(): DisasterEventStepState {
	return {
		coreEvent: {
			nationalDisasterId: "",
			nameNational: "",
			glide: "",
			nameGlobalOrRegional: "",
			hipHazardId: "",
			hipClusterId: "",
			hipTypeId: "",
			startDate: "",
			endDate: "",
			startDatePrecision: "fullDate",
			endDatePrecision: "fullDate",
			recordingInstitution: "",
			approvalStatus: "draft",
		},
		geography: {
			source: "manual",
			divisionId: "",
			geomGeoJson: "",
		},
		causedByDisasters: [],
		hazardousCausalities: [],
		responses: [],
		assessments: [],
		declarations: [],
	};
}

export function normalizeStepState(
	state: Partial<DisasterEventStepState> | null | undefined,
): DisasterEventStepState {
	const empty = makeEmptyDisasterEventStepState();
	if (!state) return empty;
	return {
		coreEvent: { ...empty.coreEvent, ...(state.coreEvent || {}) },
		geography: { ...empty.geography, ...(state.geography || {}) },
		causedByDisasters: Array.isArray(state.causedByDisasters)
			? state.causedByDisasters.map((item) => ({
					causeDisasterId: item.causeDisasterId || "",
					direction: item.direction || "TRIGGERING",
				}))
			: [],
		hazardousCausalities: Array.isArray(state.hazardousCausalities)
			? state.hazardousCausalities
			: [],
		responses: Array.isArray(state.responses) ? state.responses : [],
		assessments: Array.isArray(state.assessments) ? state.assessments : [],
		declarations: Array.isArray(state.declarations) ? state.declarations : [],
	};
}

export function serializeStepState(state: DisasterEventStepState): string {
	return JSON.stringify(state);
}

export function parseStepState(
	raw: FormDataEntryValue | null,
): DisasterEventStepState {
	if (!raw || typeof raw !== "string") {
		return makeEmptyDisasterEventStepState();
	}
	try {
		const parsed = JSON.parse(raw) as Partial<DisasterEventStepState>;
		return normalizeStepState(parsed);
	} catch {
		return makeEmptyDisasterEventStepState();
	}
}

export function toDisasterEventWriteModel(
	countryAccountsId: string,
	state: DisasterEventStepState,
): DisasterEventWriteModel {
	return {
		countryAccountsId,
		approvalStatus: state.coreEvent.approvalStatus,
		hipHazardId: state.coreEvent.hipHazardId || null,
		hipClusterId: state.coreEvent.hipClusterId || null,
		hipTypeId: state.coreEvent.hipTypeId || null,
		nationalDisasterId: state.coreEvent.nationalDisasterId,
		nameNational: state.coreEvent.nameNational,
		glide: state.coreEvent.glide,
		nameGlobalOrRegional: state.coreEvent.nameGlobalOrRegional,
		startDate: state.coreEvent.startDate || null,
		endDate: state.coreEvent.endDate || null,
		recordingInstitution: state.coreEvent.recordingInstitution,
		declarations: state.declarations.map((d) => ({
			declarationDate: d.declarationDate || null,
			description: d.description || null,
		})),
		responses: state.responses.map((r) => ({
			responseTypeId: r.responseTypeId || null,
			responseDate: r.responseDate || null,
			description: r.description || null,
		})),
		assessments: state.assessments.map((a) => ({
			assessmentTypeId: a.assessmentTypeId || null,
			assessmentDate: a.assessmentDate || null,
			description: a.description || null,
		})),
		geography:
			state.geography.divisionId || state.geography.geomGeoJson
				? {
						source: state.geography.source,
						divisionId: state.geography.divisionId || null,
						geomGeoJson: state.geography.geomGeoJson || null,
					}
				: null,
		causedByDisasters: state.causedByDisasters
			.filter((c) => c.causeDisasterId)
			.map((c) => ({
				causeDisasterId: c.direction === "TRIGGERING" ? c.causeDisasterId : "",
				effectDisasterId: c.direction === "TRIGGERED" ? c.causeDisasterId : "",
				direction: c.direction,
			})),
		hazardousCausalities: state.hazardousCausalities
			.filter((c) => c.hazardousEventId)
			.map((c) => ({
				hazardousEventId: c.hazardousEventId,
				causeType: c.causeType,
			})),
	};
}
