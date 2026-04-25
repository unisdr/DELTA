import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

export class ListHazardousEventsUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute() {
		const data = await this.hazardousEventRepository.findByCountryAccountsId(
			{},
		);

		return {
			data,
		};
	}
}
