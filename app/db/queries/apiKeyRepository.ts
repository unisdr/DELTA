import { eq } from "drizzle-orm";
import { dr, Tx } from "../../db.server";
import { apiKeyTable, InsertApiKey } from "~/drizzle/schema/apiKeyTable";

export const ApiKeyRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(apiKeyTable).where(eq(apiKeyTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(apiKeyTable)
			.where(eq(apiKeyTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.countryAccountsId, countryAccountsId));
	},
	getBySecret: (secret: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(apiKeyTable)
			.where(eq(apiKeyTable.secret, secret));
	},
	createMany: (data: InsertApiKey[], tx?: Tx) => {
		return (tx ?? dr).insert(apiKeyTable).values(data).returning().execute();
	},
};
