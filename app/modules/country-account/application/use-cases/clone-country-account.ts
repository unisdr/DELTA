import type { CountryAccountRepositoryPort } from "~/modules/country-account/domain/repositories/country-account-repository";

export class CloneCountryAccountUseCase {
	constructor(private readonly repository: CountryAccountRepositoryPort) {}

	async execute(input: { countryAccountId: string; shortDescription: string }) {
		return this.repository.clone(
			input.countryAccountId,
			input.shortDescription,
		);
	}
}
