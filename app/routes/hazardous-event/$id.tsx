import { useLoaderData } from "react-router";

import { dr } from "~/db.server";
import { makeGetHazardousEventByIdUseCase } from "~/modules/hazardous-event/hazardous-event-module.server";
import HazardousEventDetailsPage from "~/modules/hazardous-event/presentation/hazardous-event-details-page";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

export const loader = authLoaderPublicOrWithPerm("ViewData", async ({ request, params }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const item = await makeGetHazardousEventByIdUseCase().execute({
		id: params.id,
		countryAccountsId,
	});
	if (!item) {
		throw new Response("Hazardous event not found", { status: 404 });
	}

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

	return { item, hazardNameById, clusterNameById, typeNameById };
});

export default function HazardousEventViewRoute() {
	const { item, hazardNameById, clusterNameById, typeNameById } =
		useLoaderData<typeof loader>();

	return (
		<HazardousEventDetailsPage
			item={item}
			hazardNameById={hazardNameById}
			clusterNameById={clusterNameById}
			typeNameById={typeNameById}
		/>
	);
}
