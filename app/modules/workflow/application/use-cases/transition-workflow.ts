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
	entityType: WorkflowEntityType,
	status: WorkflowStatus,
	userRole: RoleId | null | undefined,
): void {
	if (!userRole) {
		throw new Error("User role is required for workflow transitions");
	}
	if (
		status === "approved" ||
		status === "rejected" ||
		status === "revision_requested"
	) {
		if (entityType === "disaster_event") {
			if (!roleHasPermission(userRole, "disaster_event.validate")) {
				throw new Error(
					"User does not have disaster event validation permission",
				);
			}
			return;
		}
		if (!roleHasPermission(userRole, "ValidateData")) {
			throw new Error("User does not have ValidateData permission");
		}
	}
	if (status === "published") {
		if (entityType === "disaster_event") {
			if (!roleHasPermission(userRole, "disaster_event.validate")) {
				throw new Error(
					"User does not have permission to publish disaster events",
				);
			}
			return;
		}
		if (!roleHasPermission(userRole, "ValidateData")) {
			throw new Error("User does not have permission to publish records");
		}
	}
	if (status === "submitted" && entityType === "disaster_event") {
		if (!roleHasPermission(userRole, "disaster_event.submit_for_validation")) {
			throw new Error("User does not have disaster event submit permission");
		}
	}
}

export class TransitionWorkflowUseCase {
	constructor(private readonly workflowRepository: WorkflowRepositoryPort) {}

	async execute(input: TransitionWorkflowInput) {
		const toStatus = normalizeWorkflowStatus(input.toStatus);
		assertPermissionForStatus(input.entityType, toStatus, input.userRole);
		return this.workflowRepository.transition({
			entityId: input.entityId,
			entityType: input.entityType,
			toStatus,
			actionBy: input.userId ?? null,
			comment: input.comment ?? null,
		});
	}
}
