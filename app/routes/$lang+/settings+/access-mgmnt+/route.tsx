import { MetaFunction, Outlet } from "react-router";
import { getUserCountryAccountsWithUserByCountryAccountsId } from "~/db/queries/userCountryAccountsRepository";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { paginationQueryFromURL } from "~/frontend/pagination/api.server";
import { authLoaderWithPerm } from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	getUserRoleFromSession
} from "~/utils/session";
import { ViewContext } from "~/frontend/context";
import { htmlTitle } from "~/utils/htmlmeta";
import AccessManagementPage from "~/pages/AccessManagementPage";

export const meta: MetaFunction = () => {
	const ctx = new ViewContext();

	return [
		{
			title: htmlTitle(
				ctx,
				ctx.t({
					code: "meta.access_management",
					msg: "Access Management",
				}),
			),
		},
		{
			name: "description",
			content: ctx.t({
				code: "meta.access_management",
				msg: "Access Management",
			}),
		},
	];
};

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const { request } = loaderArgs;
	const url = new URL(request.url);
	const search = url.searchParams.get("search") || "";

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const organizations = await OrganizationRepository.getByCountryAccountsId(
		countryAccountsId,
	);

	const pagination = paginationQueryFromURL(request, []);

	const items = await getUserCountryAccountsWithUserByCountryAccountsId(
		pagination.query.skip,
		pagination.query.take,
		countryAccountsId,
	);

	const userRole = await getUserRoleFromSession(request);

	return {
		...items,
		organizations,
		search,
		userRole,
	};
});

export default function AccessManagementLayout() {
	return (
		<>
			<AccessManagementPage />
			<Outlet />
		</>
	);
}
