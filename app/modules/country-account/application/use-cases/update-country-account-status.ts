import type { CountryAccountStatus } from "~/drizzle/schema/countryAccountsTable";
import type { CountryAccountRepositoryPort } from "~/modules/country-account/domain/repositories/country-account-repository";

export class UpdateCountryAccountStatusUseCase {
	constructor(private readonly repository: CountryAccountRepositoryPort) {}

	async execute(input: {
		id: string;
		status: CountryAccountStatus;
		shortDescription: string;
	}) {
		return this.repository.updateStatus(
			input.id,
			input.status,
			input.shortDescription,
		);
	}
}
