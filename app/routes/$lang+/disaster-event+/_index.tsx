import { useLoaderData } from "react-router";
import { DisasterEventRepository } from "~/db/queries/disasterEventRepository";
import DisasterEventsPage from "~/frontend/disaster-event/DisasterEventsPage";
import { authLoaderWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { paginationQueryFromURL } from "~/frontend/pagination/api.server";
import { CountryRepository } from "~/db/queries/countriesRepository";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";

export const loader = authLoaderWithPerm(
	"ViewDisasterEvents",
	async ({ request }) => {
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const countryAccounts = await CountryAccountsRepository.getById(countryAccountsId);
		if (!countryAccounts) {
			throw new Response("Country accounts not found", { status: 404 });
		}
		const country = await CountryRepository.getById(countryAccounts.countryId);
		if (!country) {
			throw new Response("Country not found", { status: 404 });
		}

		const { viewData } = paginationQueryFromURL(request, []);

		const result = await DisasterEventRepository.getByCountryAccountsIdPaginated(
			countryAccountsId,
			viewData.page,
			viewData.pageSize,
		);

		return { ...result, countryName: country.name };
	},
);

export default function DisasterEventIndexRoute() {
	const { items, pagination, countryName } = useLoaderData<typeof loader>();
	return <DisasterEventsPage data={items} pagination={pagination} countryName={countryName} />;
}