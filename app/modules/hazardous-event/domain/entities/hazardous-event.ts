import type { WorkflowStatus } from "~/modules/workflow/domain/entities/workflow-status";
import type { HazardousEventGeometry } from "./hazardous-event-geometry";

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
	recordOriginator: string | null;
	dataSource: string | null;
	hazardousEventStatus: HazardousEventLifecycleStatus | null;
	workflowStatus: WorkflowStatus;
	approvalStatus?: WorkflowStatus;
	createdByUserId: string | null;
	updatedByUserId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	causeHazardousEventIds?: string[];
	effectHazardousEventIds?: string[];
	hazardousEventAttachmentIds?: string[];
	hazardousEventGeometry?: HazardousEventGeometry[];
}
