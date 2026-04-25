import { redirect, useLoaderData } from "react-router";

import { makeListHazardousEventsUseCase } from "~/modules/hazardous-event/hazardous-event-module.server";
import HazardousEventsPage from "~/modules/hazardous-event/presentation/hazardous-events-page";
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

	return result;
});

export default function HazardousEventIndexRoute() {
	const { data, filters } = useLoaderData<typeof loader>();

	return <HazardousEventsPage data={data} filters={filters} />;
}
