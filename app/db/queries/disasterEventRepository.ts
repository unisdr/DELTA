import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { disasterEventTable } from "~/drizzle/schema";

export const DisasterEventRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(disasterEventTable)
			.where(eq(disasterEventTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(disasterEventTable)
			.where(eq(disasterEventTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(disasterEventTable)
			.where(eq(disasterEventTable.countryAccountsId, countryAccountsId));
	},
};
