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
	startDate: string | null;
	endDate: string | null;
	nationalSpecification: string | null;
	description: string | null;
	chainsExplanation: string | null;
	magnitude: string | null;
	recordOriginator: string;
	dataSource: string | null;
	hazardousEventStatus: HazardousEventLifecycleStatus | null;
	approvalStatus: HazardousEventApprovalStatus;
	parentId: string | null;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export type HazardousEventListItem = Pick<
	HazardousEvent,
	| "id"
	| "hipHazardId"
	| "hipClusterId"
	| "hipTypeId"
	| "recordOriginator"
	| "approvalStatus"
	| "startDate"
	| "description"
	| "dataSource"
>;
