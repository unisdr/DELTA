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
	startDate: Date | null;
	endDate: Date | null;
	nationalSpecification: string | null;
	description: string | null;
	chainsExplanation: string | null;
	magnitude: string | null;
	recordOriginator: string;
	dataSource: string | null;
	hazardousEventStatus: HazardousEventLifecycleStatus | null;
	approvalStatus: HazardousEventApprovalStatus;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	causeHazardousEventIds?: string[];
	effectHazardousEventIds?: string[];
}
