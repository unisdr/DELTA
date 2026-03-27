import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { devExample1Table, InsertDevExample1 } from "~/drizzle/schema";

export const DevExample1Repository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(devExample1Table)
			.where(eq(devExample1Table.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(devExample1Table)
			.where(eq(devExample1Table.countryAccountsId, countryAccountsId));
	},
	createMany: (data: InsertDevExample1[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(devExample1Table)
			.values(data)
			.returning()
			.execute();
	},
};
