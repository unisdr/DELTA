import { devExample2Table } from "~/drizzle/schema/devExample2Table";

import { dr } from "~/db.server";

import { asc, eq } from "drizzle-orm";

import { csvExportLoader } from "~/backend.server/handlers/form/csv_export";
import { LoaderFunctionArgs } from "react-router";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("No selected instance", { status: 401 });
	}

	return csvExportLoader({
		table: devExample2Table,
		fetchData: () => {
			return dr.query.devExample2Table.findMany({
				columns: {
					id: true,
					field1: true,
				},
				where: eq(devExample2Table.countryAccountsId, countryAccountsId),
				orderBy: [asc(devExample2Table.id)],
			});
		},
	})(args);
};
