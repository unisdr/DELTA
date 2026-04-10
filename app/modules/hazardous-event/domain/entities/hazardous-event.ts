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
	status: string | null;
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
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
}

export type HazardousEventListItem = Pick<
	HazardousEvent,
	| "id"
	| "hipHazardId"
	| "hipClusterId"
	| "hipTypeId"
	| "recordOriginator"
	| "startDate"
	| "endDate"
	| "approvalStatus"
	| "createdAt"
	| "updatedAt"
>;

export interface HazardousEventWriteModel {
	countryAccountsId: string;
	hipHazardId?: string | null;
	hipClusterId?: string | null;
	hipTypeId?: string | null;
	startDate: string;
	endDate: string;
	nationalSpecification?: string | null;
	description?: string | null;
	chainsExplanation?: string | null;
	magnitude?: string | null;
	spatialFootprint?: unknown;
	attachments?: unknown;
	recordOriginator: string;
	dataSource?: string | null;
	hazardousEventStatus?: HazardousEventLifecycleStatus | null;
	approvalStatus?: HazardousEventApprovalStatus;
	apiImportId?: string | null;
	parentId?: string | null;
	createdByUserId?: string;
	updatedByUserId?: string;
}
