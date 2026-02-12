import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";

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
					count: sql<number>`count(${disruptionTable.id})`,
				})
				.from(disruptionTable)
				.innerJoin(disasterRecordsTable, eq(disruptionTable.recordId, disasterRecordsTable.id))
				.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId));
			return count;
		},
		async (offsetLimit) => {
			return dr.query.disruptionTable.findMany({
				...offsetLimit,
				columns: {
					id: true,
					durationDays: true,
					durationHours: true,
					usersAffected: true,
					responseOperation: true,
					responseCost: true,
					responseCurrency: true,
					peopleAffected: true,
					spatialFootprint: true,
					attachments: true,
				},
				where: (disruptions, { eq, and, inArray }) =>
					and(
						inArray(
							disruptions.recordId,
							dr
								.select({ id: disasterRecordsTable.id })
								.from(disasterRecordsTable)
								.where(eq(disasterRecordsTable.countryAccountsId, countryAccountsId)),
						),
					),
				orderBy: [desc(disruptionTable.durationDays)],
			});
		},
	)(args);
};
