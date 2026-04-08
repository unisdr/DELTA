import type { SelectCountryAccounts } from "~/drizzle/schema/countryAccountsTable";
import type { SelectCountries } from "~/drizzle/schema/countriesTable";
import type { SelectUserCountryAccounts } from "~/drizzle/schema/userCountryAccountsTable";

export type InstanceOption = SelectUserCountryAccounts & {
	countryAccount: SelectCountryAccounts & {
		country: SelectCountries;
	};
};

export interface SelectInstanceRepositoryPort {
	getActiveInstancesForUser(userId: string): Promise<InstanceOption[]>;
}
