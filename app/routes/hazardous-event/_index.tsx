import { redirect, useLoaderData } from "react-router";

import {
	makeHazardousEventRepository,
	makeListHazardousEventsUseCase,
} from "~/modules/hazardous-event/hazardous-event-module.server";
import HazardousEventsPage from "~/modules/hazardous-event/presentation/hazardous-events-page";
import { dr } from "~/db.server";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession, getUserIdFromSession } from "~/utils/session";

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
	const sortField =
		(url.searchParams.get("sortField") as
			| "workflowStatus"
			| "nationalSpecification"
			| "specificHazard"
			| "recordOriginator"
			| "id"
			| "startDate"
			| "updatedAt"
			| null) || "updatedAt";
	const sortOrderRaw = Number.parseInt(
		url.searchParams.get("sortOrder") || "-1",
		10,
	);
	const sortOrder = sortOrderRaw === 1 ? 1 : -1;

	const hazardTypeId = url.searchParams.get("hazardTypeId") || undefined;
	const hazardClusterId = url.searchParams.get("hazardClusterId") || undefined;
	const hazardId = url.searchParams.get("hazardId") || undefined;
	const recordOriginatorFilter = url.searchParams.get("recordOriginatorFilter") || undefined;
	const hazardousEventStatus = url.searchParams.get("hazardousEventStatus") || undefined;
	const workflowStatusFilter =
		url.searchParams.get("workflowStatusFilter") ||
		url.searchParams.get("approvalStatusFilter") ||
		undefined;
	const startDateFromRaw = url.searchParams.get("startDateFrom");
	const startDateToRaw = url.searchParams.get("startDateTo");
	const startDateFrom = startDateFromRaw ? new Date(startDateFromRaw) : undefined;
	const startDateTo = startDateToRaw ? new Date(startDateToRaw) : undefined;
	const myRecords = url.searchParams.get("myRecords") === "true";

	const [hipHazards, hipClusters, hipTypes] = await Promise.all([
		dr.query.hipHazardTable.findMany(),
		dr.query.hipClusterTable.findMany(),
		dr.query.hipTypeTable.findMany(),
	]);

	const loggedInUserId = myRecords ? await getUserIdFromSession(request) : undefined;

	const result = await makeListHazardousEventsUseCase().execute({
		countryAccountsId,
		page,
		pageSize,
		search,
		sortField,
		sortOrder,
		hazardTypeId,
		hazardClusterId,
		hazardId,
		hipClusters: hipClusters.map((c) => ({ id: c.id, typeId: c.typeId })),
		hipHazards: hipHazards.map((h) => ({ id: h.id, clusterId: h.clusterId })),
		recordOriginatorFilter,
		hazardousEventStatus,
		workflowStatusFilter,
		startDateFrom,
		startDateTo,
		createdByUserId: loggedInUserId ?? undefined,
	});
	const countryAccount = await CountryAccountsRepository.getByIdWithCountry(
		countryAccountsId,
	);
	const totalHazardousEvents = (
		await makeHazardousEventRepository().findByCountryAccountsId(countryAccountsId)
	).length;

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
		hipTypes: hipTypes.map((t) => ({ id: t.id, name_en: t.name_en })),
		hipClusters: hipClusters.map((c) => ({ id: c.id, typeId: c.typeId, name_en: c.name_en })),
		hipHazards: hipHazards.map((h) => ({ id: h.id, clusterId: h.clusterId, name_en: h.name_en })),
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
		hipTypes,
		hipClusters,
		hipHazards,
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
			hipTypes={hipTypes}
			hipClusters={hipClusters}
			hipHazards={hipHazards}
		/>
	);
}
