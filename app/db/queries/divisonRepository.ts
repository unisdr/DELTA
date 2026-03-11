import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { divisionTable } from "~/drizzle/schema/divisionTable";

export const divisionRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	},
};
