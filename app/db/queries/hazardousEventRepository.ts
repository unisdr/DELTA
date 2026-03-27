import { dr, Tx } from "~/db.server";
import { hazardousEventTable, InsertHazardousEvent } from "~/drizzle/schema";
import { eq } from "drizzle-orm";

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

	createMany: (data: InsertHazardousEvent[], tx?: Tx) => {
		return (tx ?? dr)
			.insert(hazardousEventTable)
			.values(data)
			.returning()
			.execute();
	},

	countByCountryAccountsId: (countryAccountsId: string): Promise<number> => {
		return dr.$count(
			hazardousEventTable,
			eq(hazardousEventTable.countryAccountsId, countryAccountsId),
		);
	},
};
