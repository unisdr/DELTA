import type { DisasterEventDeclaration } from "./disaster-event-declaration";
import type { DisasterEventAssessment } from "./disaster-event-assessment";
import type { DisasterEventGeometry } from "./disaster-event-geometry";
import type { DisasterEventResponse } from "./disaster-event-response";
import type { WorkflowStatus } from "~/modules/workflow/domain/entities/workflow-status";

export interface DisasterEventDeclarationInput {
	declarationDate: string | null;
	description: string | null;
}

export interface DisasterEventResponseInput {
	responseTypeId: string | null;
	responseDate: string | null;
	description: string | null;
}

export interface DisasterEventAssessmentInput {
	assessmentTypeId: string | null;
	assessmentDate: string | null;
	description: string | null;
}

export interface DisasterEventAttachmentInput {
	title: string;
	fileKey: string;
	fileName: string;
	fileType: string;
	fileSize: number;
}

export interface DisasterEventGeographyInput {
	source: "manual" | "derived_from_division";
	divisionId: string | null;
	geomGeoJson: string | null;
}

export type DisasterEventGeometryType =
	| "POINT"
	| "LINESTRING"
	| "POLYGON"
	| "MULTIPOLYGON";

export interface DisasterEventGeometryInput {
	geojson: string;
	geometryType: DisasterEventGeometryType;
	name?: string | null;
	isPrimary: boolean;
}

export interface DisasterCausalityInput {
	causeDisasterId: string;
	effectDisasterId: string;
	direction?: "TRIGGERING" | "TRIGGERED";
}

export interface DisasterHazardousCausalityInput {
	hazardousEventId: string;
	causeType: "DE_CAUSE_HE" | "HE_CAUSE_DE";
}

export interface DisasterEvent {
	id: string;
	countryAccountsId: string;
	workflowStatus: WorkflowStatus;
	approvalStatus?: WorkflowStatus;
	hipHazardId: string | null;
	hipClusterId: string | null;
	hipTypeId: string | null;
	nationalDisasterId: string;
	nameNational: string;
	glide: string;
	nameGlobalOrRegional: string;
	startDate: Date | null;
	endDate: Date | null;
	recordingInstitution: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	validatedByUserId: string | null;
	validatedAt: Date | null;
	publishedByUserId: string | null;
	publishedAt: Date | null;
	declarations: DisasterEventDeclaration[];
	responses: DisasterEventResponse[];
	assessments: DisasterEventAssessment[];
	disasterEventAttachmentIds?: string[];
	disasterEventGeometry: DisasterEventGeometry[];
	causedByDisasters: DisasterCausalityInput[];
	hazardousCausalities: DisasterHazardousCausalityInput[];
}

export type DisasterEventListItem = Pick<
	DisasterEvent,
	| "id"
	| "workflowStatus"
	| "nameNational"
	| "nationalDisasterId"
	| "recordingInstitution"
	| "startDate"
	| "endDate"
	| "createdAt"
	| "updatedAt"
>;

export interface DisasterEventWriteModel {
	countryAccountsId: string;
	workflowStatus?: WorkflowStatus;
	approvalStatus?: WorkflowStatus;
	createdByUserId?: string | null;
	updatedByUserId?: string | null;
	validatedByUserId?: string | null;
	validatedAt?: string | null;
	publishedByUserId?: string | null;
	publishedAt?: string | null;
	hipHazardId?: string | null;
	hipClusterId?: string | null;
	hipTypeId?: string | null;
	nationalDisasterId: string;
	nameNational: string;
	glide?: string;
	nameGlobalOrRegional?: string;
	startDate?: string | null;
	endDate?: string | null;
	recordingInstitution: string;
	declarations?: DisasterEventDeclarationInput[];
	responses?: DisasterEventResponseInput[];
	assessments?: DisasterEventAssessmentInput[];
	geography?: DisasterEventGeographyInput | null;
	geometries?: DisasterEventGeometryInput[];
	causedByDisasters?: DisasterCausalityInput[];
	hazardousCausalities?: DisasterHazardousCausalityInput[];
	notifiedUserIds?: string[];
	workflowComment?: string | null;
}
