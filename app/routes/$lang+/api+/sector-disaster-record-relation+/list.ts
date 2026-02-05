import {
	disasterRecordsTable,
	sectorDisasterRecordsRelationTable,
} from "~/drizzle/schema";

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
					count: sql<number>`count(${sectorDisasterRecordsRelationTable.id})`,
				})
				.from(sectorDisasterRecordsRelationTable)
				.innerJoin(
					disasterRecordsTable,
					eq(
						sectorDisasterRecordsRelationTable.disasterRecordId,
						disasterRecordsTable.id
					)
				)
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.sectorDisasterRecordsRelationTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					sectorId: true,
					disasterRecordId: true,
					damageCost: true,
					damageCostCurrency: true,
					damageRecoveryCost: true,
					damageRecoveryCostCurrency: true,
					withDisruption: true,
					withLosses: true,
					lossesCost: true,
					lossesCostCurrency: true,
				},
				where: (sectorDisasterRecordsRelation, { eq, and, inArray }) =>
					and(
						inArray(
							sectorDisasterRecordsRelation.disasterRecordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(
									eq(disasterRecordsTable.countryAccountsId, countryAccountsId)
								)
						)
					),
				orderBy: [desc(sectorDisasterRecordsRelationTable.id)],
			});
		}
	)(args);
};
