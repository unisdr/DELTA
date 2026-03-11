import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { hazardousEventTable } from "~/drizzle/schema";

export const HazardousEventRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(hazardousEventTable)
			.where(eq(hazardousEventTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(hazardousEventTable)
			.where(eq(hazardousEventTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(hazardousEventTable)
			.where(eq(hazardousEventTable.countryAccountsId, countryAccountsId));
	},
};
