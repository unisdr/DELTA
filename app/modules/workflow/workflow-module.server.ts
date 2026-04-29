import { TransitionWorkflowUseCase } from "~/modules/workflow/application/use-cases/transition-workflow";
import type { WorkflowRepositoryPort } from "~/modules/workflow/domain/repositories/workflow-repository";
import { getWorkflowDb } from "~/modules/workflow/infrastructure/db/client.server";
import { DrizzleWorkflowRepository } from "~/modules/workflow/infrastructure/repositories/drizzle-workflow-repository.server";

export function makeWorkflowRepository(): WorkflowRepositoryPort {
	return new DrizzleWorkflowRepository(getWorkflowDb());
}

export function makeTransitionWorkflowUseCase(
	repository: WorkflowRepositoryPort = makeWorkflowRepository(),
): TransitionWorkflowUseCase {
	return new TransitionWorkflowUseCase(repository);
}
