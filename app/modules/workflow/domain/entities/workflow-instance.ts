import type { WorkflowEntityType, WorkflowStatus } from "./workflow-status";

export interface WorkflowInstance {
	id: string;
	entityId: string;
	entityType: WorkflowEntityType;
	status: WorkflowStatus;
	createdAt: Date;
	updatedAt: Date | null;
	draftedAt: Date | null;
	submittedAt: Date | null;
	approvedAt: Date | null;
	publishedAt: Date | null;
	rejectedAt: Date | null;
	revisionRequestedAt: Date | null;
}

export interface WorkflowTransitionInput {
	entityId: string;
	entityType: WorkflowEntityType;
	toStatus: WorkflowStatus;
	actionBy?: string | null;
	comment?: string | null;
	notifiedUserIds?: string[];
}
