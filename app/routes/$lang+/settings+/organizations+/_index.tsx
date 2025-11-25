import {
	MetaFunction,
	useLoaderData,
} from "@remix-run/react";
import { useEffect, useState } from "react";
import { getUserCountryAccountsWithUserByCountryAccountsId } from "~/db/queries/userCountryAccounts";
import { MainContainer } from "~/frontend/container";
import { paginationQueryFromURL } from "~/frontend/pagination/api.server";
import { Pagination } from "~/frontend/pagination/view";
import { NavSettings } from "~/routes/$lang+/settings/nav";
import { authLoaderWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";
import { sessionCookie } from "~/util/session";
import { LangLink } from "~/util/link";
import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

export const meta: MetaFunction = () => {
	return [
		{ title: "Organizations - DELTA Resilience" },
		{ name: "description", content: "Organizations." },
	];
};

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const { request } = loaderArgs;
	const url = new URL(request.url);
	const search = url.searchParams.get("search") || "";

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	const pagination = paginationQueryFromURL(request, []);

	const items = await getUserCountryAccountsWithUserByCountryAccountsId(
		pagination.query.skip,
		pagination.query.take,
		countryAccountsId
	);

	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);

	const userRole = session.get("userRole");

	return {
		common: await getCommonData(loaderArgs),
		...items,
		search,
		userRole: userRole,
	};
});

export default function Settings() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext(ld);
	const { items } = ld;

	const [isClient, setIsClient] = useState(false);

	// Ensure client-specific rendering only occurs after the component mounts
	useEffect(() => {
		setIsClient(true);
		setFilteredItems(items); // Ensure data is consistent
	}, [items]);

	// State for search and filtered users
	const [filteredItems, setFilteredItems] = useState(items);
	

	// Dynamically calculate pagination
	const pagination = Pagination({
		ctx,
		itemsOnThisPage: filteredItems.length,
		totalItems: ld.pagination.total,
		page: ld.pagination.pageNumber,
		pageSize: ld.pagination.pageSize,
		extraParams: ld.pagination.extraParams,
	});

	


	// Calculate user stats
	const totalUsers = items.length;

	const navSettings = <NavSettings ctx={ctx} userRole={ld.userRole} />;

	return (
		<MainContainer title="Organizations" headerExtra={navSettings}>
			<div className="dts-page-intro">
				<div className="dts-additional-actions">
					<LangLink lang={ctx.lang}
						to="/settings/organizations/new"
						className="mg-button mg-button-primary"
					>
						Add organization
					</LangLink>
				</div>
			</div>

			<section className="dts-page-section">
				{/* Add User Button */}
				<div className="dts-element-summary">
					<h2 className="dts-element-summary__title">
						<span>List of organization names to be used across DELTA.</span>
					</h2>
				</div>
			</section>

			<section className="dts-page-section">
				<div>
					<div>
						<strong className="dts-body-label">
							{filteredItems.length} of {totalUsers} organization(s)
						</strong>
					</div>
				</div>
			</section>

			{/* Users Table */}
			{isClient && (
					<section className="dts-page-section">
						<table className="dts-table">
							<thead>
								<tr>
									<th>Name</th>
									<th className="dts-table__cell-centered">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredItems.map((item, index) => (
									<tr key={index}>
										<td>
											<LangLink
												lang={ctx.lang}
												to={`/settings/access-mgmnt/edit/${item.user.id}`}
												className="link"
											>
												{item.user.firstName} {item.user.lastName}
											</LangLink>
										</td>
										<td className="dts-table__actions">
											<LangLink
												lang={ctx.lang}
												to={`/settings/access-mgmnt/edit/${item.user.id}`}
												aria-label={`Edit item ${item.user.id}`}
												className="mg-button mg-button-table"
											>
												<svg
													aria-hidden="true"
													focusable="false"
													role="img"
													style={{ marginLeft: "4px" }}
												>
													<use href="/assets/icons/edit.svg#edit"></use>
												</svg>
											</LangLink>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
			)}
			<section className="dts-page-section">
				{pagination}
			</section>
			
		</MainContainer>
	);
}
