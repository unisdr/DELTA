import { Outlet, useLoaderData } from "react-router";

import { authLoaderWithPerm } from "~/utils/auth";
import { PERMISSIONS, roleHasPermission } from "~/frontend/user/roles";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserRoleFromSession,
} from "~/utils/session";
import { stringToBoolean } from "~/utils/string";
import {
	makeListAssetsUseCase,
} from "~/modules/assets/assets-module.server";
import AssetsPage from "~/modules/assets/presentation/assets-page";

export const loader = authLoaderWithPerm(
	PERMISSIONS.ASSETS_LIST,
	async (loaderArgs) => {
		const { request } = loaderArgs;
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const userRole = await getUserRoleFromSession(request);
		const settings = await getCountrySettingsFromSession(request);

		const url = new URL(request.url);
		const search = url.searchParams.get("search") || "";
		const rawBuiltIn = url.searchParams.get("builtIn");
		const builtIn =
			rawBuiltIn === "" || rawBuiltIn == null
				? undefined
				: stringToBoolean(rawBuiltIn);
		const pageRaw = parseInt(url.searchParams.get("page") || "1", 10);
		const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
		const pageSize = 10;

		const result = await makeListAssetsUseCase().execute({
			countryAccountsId,
			search,
			builtIn,
			page,
			pageSize,
		});

		return {
			result,
			filters: { search, builtIn },
			instanceName: settings.websiteName,
			canCreate: roleHasPermission(userRole, PERMISSIONS.ASSETS_CREATE),
			canUpdate: roleHasPermission(userRole, PERMISSIONS.ASSETS_UPDATE),
			canDelete: roleHasPermission(userRole, PERMISSIONS.ASSETS_DELETE),
			userRole: userRole ?? null,
		};
	},
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();

	return (
		<>
			<AssetsPage
				result={ld.result}
				filters={ld.filters}
				instanceName={ld.instanceName}
				canCreate={ld.canCreate}
				canUpdate={ld.canUpdate}
				canDelete={ld.canDelete}
				userRole={ld.userRole}
			/>
			<Outlet />
		</>
	);
}
