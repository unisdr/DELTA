import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface ListHazardousEventsUseCaseInput {
	countryAccountsId: string;
	page: number;
	pageSize: number;
	search?: string;
	hipHazardId?: string;
	hipClusterId?: string;
	hipTypeId?: string;
	approvalStatus?: string;
	hazardousEventStatus?: string;
	fromDate?: string;
	toDate?: string;
	recordOriginator?: string;
}

export class ListHazardousEventsUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(input: ListHazardousEventsUseCaseInput) {
		const data = await this.hazardousEventRepository.findByCountryAccountsId({
			countryAccountsId: input.countryAccountsId,
			search: input.search,
			hipHazardId: input.hipHazardId,
			hipClusterId: input.hipClusterId,
			hipTypeId: input.hipTypeId,
			approvalStatus: input.approvalStatus as any,
			hazardousEventStatus: input.hazardousEventStatus as any,
			fromDate: input.fromDate,
			toDate: input.toDate,
			recordOriginator: input.recordOriginator,
			pagination: {
				page: input.page,
				pageSize: input.pageSize,
			},
		});

		return {
			filters: {
				search: input.search || "",
				hipHazardId: input.hipHazardId || "",
				hipClusterId: input.hipClusterId || "",
				hipTypeId: input.hipTypeId || "",
				approvalStatus: input.approvalStatus || "",
				hazardousEventStatus: input.hazardousEventStatus || "",
				fromDate: input.fromDate || "",
				toDate: input.toDate || "",
				recordOriginator: input.recordOriginator || "",
			},
			data,
		};
	}
}
