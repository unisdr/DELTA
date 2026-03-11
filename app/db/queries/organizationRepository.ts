import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { organizationTable } from "~/drizzle/schema";
import { isValidUUID } from "~/utils/id";

export const OrganizationRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		if (!isValidUUID(countryAccountsId)) {
			throw new Error(`Invalid UUID: ${countryAccountsId}`);
		}
		return (tx ?? dr)
			.select()
			.from(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountsId))
			.execute();
	},
};
