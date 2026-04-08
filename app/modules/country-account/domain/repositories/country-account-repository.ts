import type { CountryAccountStatus } from "~/drizzle/schema/countryAccountsTable";

export interface CountryAccountRepositoryPort {
	create(
		countryId: string,
		shortDescription: string,
		email: string,
		status: number,
		countryAccountType: string,
	): Promise<unknown>;

	updateStatus(
		id: string,
		status: CountryAccountStatus,
		shortDescription: string,
	): Promise<{ updatedCountryAccount: unknown }>;

	resendInvitation(countryAccountId: string): Promise<void>;

	clone(
		countryAccountId: string,
		shortDescription: string,
	): Promise<{ success: boolean; newCountryAccount: unknown }>;

	deleteInstance(countryAccountId: string): Promise<boolean>;
}
