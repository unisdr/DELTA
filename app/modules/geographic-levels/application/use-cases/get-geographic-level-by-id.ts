import type { GeographicLevelDetail } from "~/modules/geographic-levels/domain/entities/geographic-level";
import type { GeographicLevelRepositoryPort } from "~/modules/geographic-levels/domain/repositories/geographic-level-repository";

interface GetGeographicLevelByIdInput {
	id: string;
	countryAccountsId: string;
}

export class GetGeographicLevelByIdUseCase {
	constructor(private readonly repository: GeographicLevelRepositoryPort) {}

	async execute(
		input: GetGeographicLevelByIdInput,
	): Promise<GeographicLevelDetail | null> {
		return this.repository.findById(input.id, input.countryAccountsId);
	}
}
