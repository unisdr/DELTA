import { damagesTable, disasterRecordsTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { desc, eq, sql } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";
import { LoaderFunctionArgs } from "react-router";
import { apiAuth } from "~/backend.server/models/api_key";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	return createApiListLoader(
		async () => {
			const [{ count }] = await dr
				.select({
					count: sql<number>`count(${damagesTable.id})`,
				})
				.from(damagesTable)
				.innerJoin(
					disasterRecordsTable,
					eq(damagesTable.recordId, disasterRecordsTable.id)
				)
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.damagesTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					recordId: true,
					sectorId: true,
					assetId: true,
					totalDamageAmount : true,
					totalDamageAmountOverride : true,
					totalRepairReplacement : true,
					totalRepairReplacementOverride : true,
					totalRecovery : true,
					totalRecoveryOverride : true,
					pdDamageAmount : true,
					pdRepairCostUnit : true,
					pdRepairCostUnitCurrency : true,
					pdRepairCostTotal : true,
					pdRepairCostTotalOverride : true,
					pdRecoveryCostUnit : true,
					pdRecoveryCostUnitCurrency : true,
					pdRecoveryCostTotal : true,
					pdRecoveryCostTotalOverride : true,
					pdDisruptionDurationDays : true,
					pdDisruptionDurationHours : true,
					pdDisruptionUsersAffected : true,
					pdDisruptionPeopleAffected : true,
					pdDisruptionDescription : true,
					tdDamageAmount : true,
					tdReplacementCostUnit : true,
					tdReplacementCostUnitCurrency : true,
					tdReplacementCostTotal : true,
					tdReplacementCostTotalOverride : true,
					tdRecoveryCostUnit : true,
					tdRecoveryCostUnitCurrency : true,
					tdRecoveryCostTotal : true,
					tdRecoveryCostTotalOverride : true,
					tdDisruptionDurationDays : true,
					tdDisruptionDurationHours : true,
					tdDisruptionUsersAffected : true,
					tdDisruptionPeopleAffected : true,
					tdDisruptionDescription : true,
					spatialFootprint : true,
					attachments : true,

				},
				where: (damages, { eq, and, inArray }) =>
					and(
						inArray(
							damages.recordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(
									eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
								)
						)
					),
				orderBy: [desc(damagesTable.id)],
			});
		}
	)(args);
};
