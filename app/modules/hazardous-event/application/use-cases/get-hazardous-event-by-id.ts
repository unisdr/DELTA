import type { HazardousEventRepositoryPort } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";

export class GetHazardousEventByIdUseCase {
	constructor(
		private readonly hazardousEventRepository: HazardousEventRepositoryPort,
	) {}

	async execute(id: string) {
		return this.hazardousEventRepository.findById(id);
	}
}
