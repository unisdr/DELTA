import { auditLogsTable } from "~/drizzle/schema/auditLogsTable";
import { eq } from "drizzle-orm";
import { dr, Tx } from "~/db.server";

// export async function getAllAuditLogsWithUserByTableNameAndRecordIdsAndCountryAccountsIdOrderByTimestampDesc(
// 	tableName: string,
// 	recordId: string,
// 	countryAccountsId: string,
// ) {
// 	return await dr
// 		.select()
// 		.from(auditLogsTable)
// 		.innerJoin(userTable, eq(auditLogsTable.userId, userTable.id))
// 		.where(
// 			and(
// 				eq(auditLogsTable.countryAccountsId, countryAccountsId),
// 				eq(auditLogsTable.tableName, tableName),
// 				eq(auditLogsTable.recordId, recordId),
// 			),
// 		)
// 		.orderBy(desc(auditLogsTable.timestamp))
// 		.execute();
// }
export const AuditLogsRepository = {
	deleteByCountryAccountId: (countryAccountsId: string, tx?: Tx) => {
		return (tx ?? dr)
			.delete(auditLogsTable)
			.where(eq(auditLogsTable.countryAccountsId, countryAccountsId));
	},
};
