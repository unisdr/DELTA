import { redirect, useLoaderData } from "react-router";

import {
	makeHazardousEventRepository,
	makeListHazardousEventsUseCase,
} from "~/modules/hazardous-event/hazardous-event-module.server";
import HazardousEventsPage from "~/modules/hazardous-event/presentation/hazardous-events-page";
import { dr } from "~/db.server";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw redirect("/user/select-country-account?redirect=/hazardous-event");
	}

	const url = new URL(request.url);
	const pageRaw = parseInt(url.searchParams.get("page") || "1", 10);
	const pageSizeRaw = parseInt(url.searchParams.get("pageSize") || "25", 10);
	const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
	const pageSize = Math.max(1, Number.isNaN(pageSizeRaw) ? 25 : pageSizeRaw);
	const search = (url.searchParams.get("search") || "").trim();

	const result = await makeListHazardousEventsUseCase().execute({
		countryAccountsId,
		page,
		pageSize,
		search,
	});
	const countryAccount = await CountryAccountsRepository.getByIdWithCountry(
		countryAccountsId,
	);
	const totalHazardousEvents = (
		await makeHazardousEventRepository().findByCountryAccountsId(countryAccountsId)
	).length;

	const hipHazards = await dr.query.hipHazardTable.findMany();
	const hipClusters = await dr.query.hipClusterTable.findMany();
	const hipTypes = await dr.query.hipTypeTable.findMany();
	const hazardNameById = Object.fromEntries(
		hipHazards.map((hazard) => [hazard.id, hazard.name_en]),
	);
	const clusterNameById = Object.fromEntries(
		hipClusters.map((cluster) => [cluster.id, cluster.name_en]),
	);
	const typeNameById = Object.fromEntries(
		hipTypes.map((type) => [type.id, type.name_en]),
	);

	return {
		...result,
		countryName: countryAccount?.country?.name || "Unknown country",
		totalHazardousEvents,
		hazardNameById,
		clusterNameById,
		typeNameById,
	};
});

export default function HazardousEventIndexRoute() {
	const {
		data,
		filters,
		countryName,
		totalHazardousEvents,
		hazardNameById,
		clusterNameById,
		typeNameById,
	} = useLoaderData<typeof loader>();

	return (
		<HazardousEventsPage
			data={data}
			filters={filters}
			countryName={countryName}
			totalHazardousEvents={totalHazardousEvents}
			hazardNameById={hazardNameById}
			clusterNameById={clusterNameById}
			typeNameById={typeNameById}
		/>
	);
}
