import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { devExample1Table } from "~/drizzle/schema";

export const DevExample1Repository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(devExample1Table)
			.where(eq(devExample1Table.countryAccountsId, countryAccountsId));
	},
};
