import { auditLogsTable } from "~/drizzle/schema/auditLogsTable";
import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

export const HumanDsgConfigRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(auditLogsTable)
			.where(eq(auditLogsTable.countryAccountsId, countryAccountsId));
	},
};
