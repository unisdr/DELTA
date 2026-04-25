import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

interface GetHazardousEventByIdInput {
	id: string;
	countryAccountsId: string;
}

export class GetHazardousEventByIdUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(input: GetHazardousEventByIdInput) {
		return this.hazardousEventRepository.findById(
			input.id,
			input.countryAccountsId,
		);
	}
}
