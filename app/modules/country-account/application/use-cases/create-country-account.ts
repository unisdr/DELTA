import type { CountryAccountRepositoryPort } from "~/modules/country-account/domain/repositories/country-account-repository";

export class CreateCountryAccountUseCase {
	constructor(private readonly repository: CountryAccountRepositoryPort) {}

	async execute(input: {
		countryId: string;
		shortDescription: string;
		email: string;
		status: number;
		countryAccountType: string;
	}) {
		return this.repository.create(
			input.countryId,
			input.shortDescription,
			input.email,
			input.status,
			input.countryAccountType,
		);
	}
}
