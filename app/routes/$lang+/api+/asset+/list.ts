import { assetTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { sql, eq, or } from "drizzle-orm";

import { createApiListLoader } from "~/backend.server/handlers/view";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { apiAuth } from "~/backend.server/models/api_key";
import { BackendContext } from "~/backend.server/context";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const ctx = new BackendContext(args);

	return createApiListLoader(
		async () => {
			return dr.$count(
				assetTable,
				or(
					eq(assetTable.isBuiltIn, true),
					eq(assetTable.countryAccountsId, countryAccountsId)
				)
			);
		},
		async (offsetLimit) => {
			return dr.query.assetTable.findMany({
				...offsetLimit,
				where: or(eq(assetTable.isBuiltIn, true), eq(assetTable.countryAccountsId, countryAccountsId)),
				columns: {
					id: true,
					nationalId: true,
				},
				extras: {
					name: sql<string>`CASE
			WHEN ${assetTable.isBuiltIn} THEN ${assetTable.builtInName}->>${ctx.lang}
			ELSE ${assetTable.customName}
		END`.as("name"),
					notes: sql<string>`CASE
			WHEN ${assetTable.isBuiltIn} THEN ${assetTable.builtInNotes}->>${ctx.lang}
			ELSE ${assetTable.customNotes}
		END`.as("notes"),
				},
				orderBy: [sql`name DESC`],
			});
		}
	)(args);
};
