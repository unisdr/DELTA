import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { divisionTable, InsertDivision } from "~/drizzle/schema/divisionTable";

export const DivisionRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	},
	createMany: (data: InsertDivision[], tx?: Tx) => {
		return (tx ?? dr).insert(divisionTable).values(data).returning().execute();
	},
};
