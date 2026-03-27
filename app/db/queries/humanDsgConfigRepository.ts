import {
	humanDsgConfigTable,
	InsertHumanDsgConfig,
} from "~/drizzle/schema/humanDsgConfigTable";
import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

export const HumanDsgConfigRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(humanDsgConfigTable)
			.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(humanDsgConfigTable)
			.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountsId));
	},
	createMany: (
		data: Omit<InsertHumanDsgConfig, "countryAccountsId">[],
		countryAccountsId: string,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.insert(humanDsgConfigTable)
			.values(data.map((item) => ({ ...item, countryAccountsId })))
			.returning()
			.execute();
	},
};
