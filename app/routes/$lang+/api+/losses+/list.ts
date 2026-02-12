import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";

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
					count: sql<number>`count(${lossesTable.id})`,
				})
				.from(lossesTable)
				.innerJoin(disasterRecordsTable, eq(lossesTable.recordId, disasterRecordsTable.id))
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.lossesTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					recordId: true,
					sectorId: true,
					sectorIsAgriculture: true,
					typeNotAgriculture: true,
					typeAgriculture: true,
					relatedToNotAgriculture: true,
					relatedToAgriculture: true,
					description: true,
					publicUnit: true,
					publicUnits: true,
					publicCostUnit: true,
					publicCostUnitCurrency: true,
					publicCostTotal: true,
					publicCostTotalOverride: true,
					privateUnit: true,
					privateUnits: true,
					privateCostUnit: true,
					privateCostUnitCurrency: true,
					privateCostTotal: true,
					privateCostTotalOverride: true,
					spatialFootprint: true,
					attachments: true,
				},
				where: (losses, { eq, and, inArray }) =>
					and(
						inArray(
							losses.recordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId)),
						),
					),
				orderBy: [desc(lossesTable.id)],
			});
		},
	)(args);
};
