import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";
import type { DisasterEventApprovalStatus } from "~/modules/disaster-event/domain/entities/disaster-event";

interface ListDisasterEventsUseCaseInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
	recordingInstitution?: string;
	hazardTypeId?: string;
	hazardClusterId?: string;
	hazardId?: string;
	approvalStatus?: string;
	fromDate?: string;
	toDate?: string;
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
			approvalStatus:
				(input.approvalStatus as DisasterEventApprovalStatus | undefined) ||
				undefined,
			fromDate: input.fromDate,
			toDate: input.toDate,
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
				approvalStatus: input.approvalStatus || "",
				fromDate: input.fromDate || "",
				toDate: input.toDate || "",
			},
			data,
		};
	}
}
