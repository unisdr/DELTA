export type HazardousEventApprovalStatus =
	| "draft"
	| "waiting-for-validation"
	| "needs-revision"
	| "validated"
	| "published";

export type HazardousEventLifecycleStatus = "forecasted" | "ongoing" | "passed";

export interface HazardousEvent {
	id: string;
	countryAccountsId: string;
	hipHazardId: string | null;
	hipClusterId: string | null;
	hipTypeId: string | null;
	startDate: string;
	endDate: string;
	nationalSpecification: string | null;
	description: string | null;
	chainsExplanation: string | null;
	magnitude: string | null;
	spatialFootprint: unknown;
	attachments: unknown;
	recordOriginator: string;
	dataSource: string | null;
	hazardousEventStatus: HazardousEventLifecycleStatus | null;
	approvalStatus: HazardousEventApprovalStatus;
	apiImportId: string | null;
	parentId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}
