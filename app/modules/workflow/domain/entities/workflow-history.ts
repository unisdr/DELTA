import type { WorkflowStatus } from "./workflow-status";

export interface WorkflowHistory {
	id: string;
	workflowInstanceId: string;
	fromStatus: WorkflowStatus | null;
	toStatus: WorkflowStatus;
	actionBy: string | null;
	comment: string | null;
	createdAt: Date;
}
