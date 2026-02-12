import { disasterEventTable } from "~/drizzle/schema/disasterEventTable";

import { dr } from "~/db.server";

import { asc, eq } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";

import { authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const fetchDataWithTenant = async () => {
		return dr.query.disasterEventTable.findMany({
			where: eq(disasterEventTable.countryAccountsId, countryAccountsId),
			orderBy: [asc(disasterEventTable.id)],
		});
	};

	// Use csvExportLoader with tenant-aware data fetcher
	const exportLoader = csvExportLoader({
		table: disasterEventTable,
		fetchData: fetchDataWithTenant,
	});

	return exportLoader(loaderArgs);
});
