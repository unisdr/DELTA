import { authLoaderWithPerm } from "~/utils/auth";

import { useLoaderData } from "react-router";

import {
	DivisionBreadcrumbRow,
} from "~/backend.server/models/division";

import { NavSettings } from "~/frontend/components/nav-settings";
import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession, getUserRoleFromSession } from "~/utils/session";
import {
	makeGeographicLevelRepository,
	makeGetGeographicLevelByIdUseCase,
} from "~/modules/geographic-levels/geographic-levels-module.server";
import GeographicLevelDetail from "~/modules/geographic-levels/presentation/geographic-level-detail";

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { id } = loaderArgs.params;
		const { request } = loaderArgs;
		if (!id) {
			throw new Response("Missing item ID", { status: 400 });
		}

		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const item = await makeGetGeographicLevelByIdUseCase().execute({
			id,
			countryAccountsId,
		});

		if (!item) {
			throw new Response("Item not found", { status: 404 });
		}

		let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
		if (item.parentId) {
			breadcrumbs = await makeGeographicLevelRepository().getBreadcrumb(
				item.parentId,
				countryAccountsId,
			);
		}

		const userRole = await getUserRoleFromSession(request);

		return {
			division: item,
			breadcrumbs: breadcrumbs,
			userRole,
		};
	},
);

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();

	return (
		<MainContainer
			title={"Geographic levels"}
			headerExtra={<NavSettings userRole={loaderData.userRole ?? undefined} />}
		>
			<GeographicLevelDetail
				division={loaderData.division}
				breadcrumbs={loaderData.breadcrumbs}
			/>
		</MainContainer>
	);
}

