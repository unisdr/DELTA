import type { InsertDivision } from "~/drizzle/schema/divisionTable";
import type { GeographicLevelRepositoryPort } from "~/modules/geographic-levels/domain/repositories/geographic-level-repository";

interface UpdateGeographicLevelInput {
	id: string;
	data: InsertDivision;
	countryAccountsId: string;
}

export class UpdateGeographicLevelUseCase {
	constructor(private readonly repository: GeographicLevelRepositoryPort) {}

	async execute(input: UpdateGeographicLevelInput) {
		const data = { ...input.data, countryAccountsId: input.countryAccountsId };

		if (data.parentId) {
			const parent = await this.repository.findDivisionById(
				data.parentId,
				input.countryAccountsId,
			);
			data.level = parent && parent.level ? parent.level + 1 : 1;
		} else {
			data.level = 1;
		}

		return this.repository.update(input.id, data, input.countryAccountsId);
	}
}
