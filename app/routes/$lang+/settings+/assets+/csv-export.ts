import {
	assetTable,
} from "~/drizzle/schema";

import { dr } from "~/db.server";

import { asc, eq, and } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { BackendContext } from "~/backend.server/context";

export const loader = csvExportLoader({
	table: assetTable,
	fetchData: async (ctx: BackendContext, request: Request) => {
		// Get the country accounts ID from the session using the request passed from the loader
		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		if (!countryAccountsId) {
			throw new Response("Unauthorized, no selected instance", { status: 401 });
		}

		// Only export assets that belong to the current tenant
		const assets = await dr.query.assetTable.findMany({
			columns: {
				id: true,
				apiImportId: true,
				sectorIds: true,
				name: true,
				category: true,
				nationalId: true,
				notes: true,
				isBuiltIn: true
			},
			orderBy: [asc(assetTable.id)],
			where: and(
				eq(assetTable.countryAccountsId, countryAccountsId),
				eq(assetTable.isBuiltIn, false)
			),
		});

		for (const row of assets) {
			if (row.isBuiltIn) {
				row.name = ctx.dbt({
					type: "asset.name",
					id: String(row.id),
					msg: row.name,
				});
			}
		}

		return assets;
	},
})
