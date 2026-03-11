import { and, eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";

export const DisasterRecordsRepository = {
	getByIdAndCountryAccountsId: (
		id: string,
		countryAccountsId: string,
		tx?: Tx,
	) => {
		if (!id || typeof id !== "string") return null;
		return (tx ?? dr)
			.select()
			.from(disasterRecordsTable)
			.where(
				and(
					eq(disasterRecordsTable.id, id),
					eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
				),
			);
	},
	delete: (id: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(disasterRecordsTable)
			.where(eq(disasterRecordsTable.id, id));
	},

	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(disasterRecordsTable)
			.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
	},
	getByCountryAccountsId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.select()
			.from(disasterRecordsTable)
			.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
	},
};
