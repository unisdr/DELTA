import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";
import type { WorkflowStatus } from "~/modules/workflow/domain/entities/workflow-status";

interface ListDisasterEventsUseCaseInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
	recordingInstitution?: string;
	hazardTypeId?: string;
	hazardClusterId?: string;
	hazardId?: string;
	workflowStatus?: string;
	fromDate?: string;
	toDate?: string;
	createdByUserId?: string;
}

export class ListDisasterEventsUseCase {
	constructor(
		private readonly disasterEventRepository: DisasterEventRepositoryPort,
	) {}

	async execute(input: ListDisasterEventsUseCaseInput) {
		const data = await this.disasterEventRepository.listByCountryAccountsId({
			countryAccountsId: input.countryAccountsId,
			search: input.search,
			recordingInstitution: input.recordingInstitution,
			hazardTypeId: input.hazardTypeId,
			hazardClusterId: input.hazardClusterId,
			hazardId: input.hazardId,
			workflowStatus:
				(input.workflowStatus as WorkflowStatus | undefined) ||
				undefined,
			fromDate: input.fromDate,
			toDate: input.toDate,
			createdByUserId: input.createdByUserId,
			pagination: {
				page: input.page,
				pageSize: input.pageSize,
			},
		});

		return {
			filters: {
				search: input.search || "",
				recordingInstitution: input.recordingInstitution || "",
				hazardTypeId: input.hazardTypeId || "",
				hazardClusterId: input.hazardClusterId || "",
				hazardId: input.hazardId || "",
				workflowStatus: input.workflowStatus || "",
				fromDate: input.fromDate || "",
				toDate: input.toDate || "",
				myRecords: !!input.createdByUserId,
			},
			data,
		};
	}
}
