import type { CountryAccountRepositoryPort } from "~/modules/country-account/domain/repositories/country-account-repository";

export class DeleteCountryAccountUseCase {
	constructor(private readonly repository: CountryAccountRepositoryPort) {}

	async execute(input: { countryAccountId: string }) {
		return this.repository.deleteInstance(input.countryAccountId);
	}
}
