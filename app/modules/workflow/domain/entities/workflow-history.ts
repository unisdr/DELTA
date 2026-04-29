import type { WorkflowStatus } from "./workflow-status";

export interface WorkflowHistory {
	id: string;
	workflowInstanceId: string;
	status: WorkflowStatus;
	actionBy: string | null;
	comment: string | null;
	createdAt: Date;
}
