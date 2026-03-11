import { and, eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { assetTable } from "~/drizzle/schema";

export const AssetRepository = {
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr).delete(assetTable).where(eq(assetTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(assetTable)
			.where(eq(assetTable.countryAccountsId, countryAccountsId));
	},
	deleteByCountryAccountIdAndIsBuiltIn: (
		countryAccountsId: string,
		isBuiltIn: boolean,
		tx?: Tx,
	) => {
		return (tx ?? dr)
			.delete(assetTable)
			.where(
				and(
					eq(assetTable.countryAccountsId, countryAccountsId),
					eq(assetTable.isBuiltIn, isBuiltIn),
				),
			);
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(assetTable)
			.where(eq(assetTable.countryAccountsId, countryAccountsId));
	},
};
