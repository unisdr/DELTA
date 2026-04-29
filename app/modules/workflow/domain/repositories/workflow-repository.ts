import type { WorkflowHistory } from "../entities/workflow-history";
import type {
	WorkflowInstance,
	WorkflowTransitionInput,
} from "../entities/workflow-instance";
import type { WorkflowEntityType, WorkflowStatus } from "../entities/workflow-status";

export interface WorkflowRepositoryPort {
	createInstance(args: {
		entityId: string;
		entityType: WorkflowEntityType;
		status?: WorkflowStatus;
	}): Promise<WorkflowInstance | null>;
	findByEntity(
		entityType: WorkflowEntityType,
		entityId: string,
	): Promise<WorkflowInstance | null>;
	transition(args: WorkflowTransitionInput): Promise<WorkflowInstance | null>;
	getHistory(
		entityType: WorkflowEntityType,
		entityId: string,
	): Promise<WorkflowHistory[]>;
}
