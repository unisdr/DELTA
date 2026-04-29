import { roleHasPermission } from "~/frontend/user/roles";
import type { RoleId } from "~/frontend/user/roles";
import {
	normalizeWorkflowStatus,
	type WorkflowEntityType,
	type WorkflowStatus,
} from "~/modules/workflow/domain/entities/workflow-status";
import type { WorkflowRepositoryPort } from "~/modules/workflow/domain/repositories/workflow-repository";

export interface TransitionWorkflowInput {
	entityType: WorkflowEntityType;
	entityId: string;
	toStatus: WorkflowStatus | string;
	userId?: string | null;
	userRole?: RoleId | null;
	comment?: string | null;
}

function assertPermissionForStatus(
	status: WorkflowStatus,
	userRole: RoleId | null | undefined,
): void {
	if (!userRole) {
		throw new Error("User role is required for workflow transitions");
	}
	if (status === "approved" || status === "rejected" || status === "revision_requested") {
		if (!roleHasPermission(userRole, "ValidateData")) {
			throw new Error("User does not have ValidateData permission");
		}
	}
	if (status === "published") {
		if (!roleHasPermission(userRole, "ValidateData")) {
			throw new Error("User does not have permission to publish records");
		}
	}
}

export class TransitionWorkflowUseCase {
	constructor(private readonly workflowRepository: WorkflowRepositoryPort) {}

	async execute(input: TransitionWorkflowInput) {
		const toStatus = normalizeWorkflowStatus(input.toStatus);
		assertPermissionForStatus(toStatus, input.userRole);
		return this.workflowRepository.transition({
			entityId: input.entityId,
			entityType: input.entityType,
			toStatus,
			actionBy: input.userId ?? null,
			comment: input.comment ?? null,
		});
	}
}
