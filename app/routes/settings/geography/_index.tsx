import { authLoaderWithPerm } from "~/utils/auth";

import { useLoaderData } from "react-router";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { getUserRoleFromSession } from "~/utils/session";
import { makeGetGeographicLevelsPageDataUseCase } from "~/modules/geographic-levels/geographic-levels-module.server";
import GeographicLevelsPage from "~/modules/geographic-levels/presentation/geographic-levels-page";

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { request } = loaderArgs;

		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const url = new URL(request.url);
		const parentId = url.searchParams.get("parent") || null;

		const pageData = await makeGetGeographicLevelsPageDataUseCase().execute({
			request,
			countryAccountsId,
			parentId,
		});

		const userRole = await getUserRoleFromSession(request);

		return {
			...pageData,
			userRole: userRole,
		};
	},
);

export default function Screen() {
	const ld = useLoaderData<typeof loader>();

	return <GeographicLevelsPage {...ld} />;
}


