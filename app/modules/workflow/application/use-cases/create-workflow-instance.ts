import {
	normalizeWorkflowStatus,
	type WorkflowEntityType,
	type WorkflowStatus,
} from "~/modules/workflow/domain/entities/workflow-status";
import type { WorkflowRepositoryPort } from "~/modules/workflow/domain/repositories/workflow-repository";

export interface CreateWorkflowInstanceInput {
	entityType: WorkflowEntityType;
	entityId: string;
	initialStatus?: WorkflowStatus | string;
}

export class CreateWorkflowInstanceUseCase {
	constructor(private readonly workflowRepository: WorkflowRepositoryPort) {}

	async execute(input: CreateWorkflowInstanceInput) {
		return this.workflowRepository.createInstance({
			entityType: input.entityType,
			entityId: input.entityId,
			status: normalizeWorkflowStatus(input.initialStatus),
		});
	}
}
