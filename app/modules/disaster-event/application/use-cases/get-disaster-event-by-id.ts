import type { DisasterEventRepositoryPort } from "~/modules/disaster-event/domain/repositories/disaster-event-repository";

interface GetDisasterEventByIdInput {
	id: string;
	countryAccountsId: string;
}

export class GetDisasterEventByIdUseCase {
	constructor(
		private readonly disasterEventRepository: DisasterEventRepositoryPort,
	) {}

	async execute(input: GetDisasterEventByIdInput) {
		return this.disasterEventRepository.findById(
			input.id,
			input.countryAccountsId,
		);
	}
}
