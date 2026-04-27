export type DisasterEventApprovalStatus =
	| "draft"
	| "waiting-for-validation"
	| "needs-revision"
	| "validated"
	| "published";

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

export interface DisasterCausalityInput {
	causeDisasterId: string;
	effectDisasterId: string;
}

export interface DisasterHazardousCausalityInput {
	hazardousEventId: string;
	causeType: "DE_CAUSE_HE" | "HE_CAUSE_DE";
}

export interface DisasterEvent {
	id: string;
	countryAccountsId: string;
	approvalStatus: DisasterEventApprovalStatus;
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
	declarations: DisasterEventDeclarationInput[];
	responses: DisasterEventResponseInput[];
	assessments: DisasterEventAssessmentInput[];
	attachments: DisasterEventAttachmentInput[];
	geography: DisasterEventGeographyInput | null;
	causedByDisasters: DisasterCausalityInput[];
	hazardousCausalities: DisasterHazardousCausalityInput[];
}

export type DisasterEventListItem = Pick<
	DisasterEvent,
	| "id"
	| "approvalStatus"
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
	approvalStatus?: DisasterEventApprovalStatus;
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
	attachments?: DisasterEventAttachmentInput[];
	geography?: DisasterEventGeographyInput | null;
	causedByDisasters?: DisasterCausalityInput[];
	hazardousCausalities?: DisasterHazardousCausalityInput[];
}
