import {
	MetaFunction,
	useLoaderData,
} from "@remix-run/react";
import { format } from "date-fns";
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


export const meta: MetaFunction = () => {
	return [
		{ title: "Access Management - DELTA Resilience" },
		{ name: "description", content: "Access Management." },
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
		
		...items,
		search,
		userRole: userRole,
	};
});

export default function Settings() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { items } = ld;

	const [isClient, setIsClient] = useState(false);

	// Ensure client-specific rendering only occurs after the component mounts
	useEffect(() => {
		setIsClient(true);
		setFilteredItems(items); // Ensure data is consistent
	}, [items]);

	// State for search and filtered users
	const [filteredItems, setFilteredItems] = useState(items);
	const [organizationFilter, setOrganizationFilter] = useState("");
	const [roleFilter, setRoleFilter] = useState("");

	// Dynamically calculate pagination
	const pagination = Pagination({
		ctx,
		itemsOnThisPage: filteredItems.length,
		totalItems: ld.pagination.total,
		page: ld.pagination.pageNumber,
		pageSize: ld.pagination.pageSize,
		extraParams: ld.pagination.extraParams,
	});

	const handleOrganizationFilter = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.toLowerCase();
		setOrganizationFilter(value);
		setFilteredItems(
			items.filter((item) =>
				item.user.organization.toLowerCase().includes(value)
			)
		);
	};

	const handleRoleFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedRole = e.target.value;
		setRoleFilter(selectedRole);

		// Update the table data based on the selected role
		const filteredData =
			selectedRole === "all"
				? items // Show all roles
				: items.filter((item) => item.role === selectedRole);
		setFilteredItems(filteredData);
	};

	// Calculate user stats
	const totalUsers = items.length;

	// Handle different formats for `emailVerified`
	const activatedUsers = filteredItems.filter((item) => {
		return item.user.emailVerified === true;
	}).length;

	const pendingUsers = filteredItems.filter(
		(item) => !item.user.emailVerified
	).length;

	const navSettings = <NavSettings ctx={ctx} userRole={ld.userRole} />;

	return (
		<MainContainer title={ctx.t({"code": "nav.access_management", "msg": "Access management"})} headerExtra={navSettings}>
			<div className="dts-page-intro">
				<div className="dts-additional-actions">
					<a
						href={ctx.url("/about/technical-specifications")}
						className="dts-link"
						target="_blank"
						rel="noopener noreferrer"
					>
						{ctx.t({"code": "nav.technical_specifications", "msg": "Technical specifications"})}
						<svg
							aria-hidden="true"
							focusable="false"
							role="img"
							style={{ marginLeft: "4px" }}
						>
							<use href="/assets/icons/external-link-open-new.svg#external"></use>
						</svg>
					</a>
					<LangLink lang={ctx.lang}
						to="/settings/access-mgmnt/invite"
						className="mg-button mg-button-secondary"
					>
						{ctx.t({"code": "settings.access_mgmnt.add_user", "msg": "Add user"})}
					</LangLink>
				</div>
			</div>

			{/* Add User Button */}
			<section className="dts-page-section">
				<div className="dts-element-summary">
					<h2 className="dts-element-summary__title">
						<span>
							{ctx.t({
								"code": "settings.access_mgmnt.current_user_count", 
								"msg": "Currently there are [{totalUsers}] users in the system."
							}, { "totalUsers": totalUsers })}
						</span>
					</h2>
				</div>
			</section>

			{/* Filter Form */}
			<form method="get" className="dts-form">
				<div className="mg-grid mg-grid__col-3">
					{/* Organisation Filter */}
					<div className="dts-form-component">
						<label className="dts-form-component__label">
							{ctx.t({"code": "common.organization", "msg": "Organization"})}
							<input
								type="search"
								name="organization"
								value={organizationFilter}
								placeholder="Type organisation name"
								onChange={handleOrganizationFilter}
								autoComplete="organization"
							/>
						</label>
					</div>

					{/* Role Filter */}
					<div className="dts-form-component">
						<label className="dts-form-component__label">
							{ctx.t({"code": "common.role", "msg": "Role"})}
							<select
								name="role"
								value={roleFilter}
								onChange={handleRoleFilter}
							>
								<option value="all">All Roles</option>
								<option value="data-viewer">Data Viewer</option>
								<option value="data-collector">Data Collector</option>
								<option value="data-validator">Data Validator</option>
								<option value="admin">Admin</option>
							</select>
						</label>
					</div>
				</div>
			</form>

			<section className="dts-page-section">
				<div>
					<strong className="dts-body-label">
						{filteredItems.length} of {totalUsers} Users
					</strong>
				</div>

				{/* Status Legend */}
				<div className="dts-legend">
					<span className="dts-body-label">{ctx.t({"code": "common.status_legend", "msg": "Status legend"})}</span>

					<div className="dts-legend__item">
						<span
							className="dts-status dts-status--activated"
							aria-labelledby="legend7"
						></span>
						<span id="legend7">{ctx.t({"code": "settings.access_mgmnt.account_activated", "msg": "Account activated"})}: {activatedUsers}</span>
					</div>

					<div className="dts-legend__item">
						<span aria-labelledby="legend8"></span>
						<span id="legend8">{ctx.t({"code": "settings.access_mgmnt.account_activation_pending", "msg": "Account activation pending"})}: {pendingUsers}</span>
					</div>
				</div>
			</section>

			{/* Users Table */}
			{isClient && (
				<section className="dts-page-section">
					<table className="dts-table">
						<thead>
							<tr>
								<th>{ctx.t({"code": "common.status", "msg": "Status"})}</th>
								<th>{ctx.t({"code": "common.name", "msg": "Name"})}</th>
								<th>{ctx.t({"code": "common.email", "msg": "Email"})}</th>
								<th>{ctx.t({"code": "common.organization", "msg": "Organization"})}</th>
								<th>{ctx.t({"code": "common.role", "msg": "Role"})}</th>
								<th>{ctx.t({"code": "common.modified", "msg": "Modified"})}</th>
								<th>{ctx.t({"code": "common.actions", "msg": "Actions"})}</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item, index) => (
								<tr key={index}>
									<td>
										<span
											className={`dts-access-management__status-dot ${
												item.user.emailVerified
													? "dts-access-management__status-dot--activated"
													: "dts-access-management__status-dot--pending"
											}`}
										>
											<span className="dts-access-management__tooltip-text">
												{item.user.emailVerified ? 
													ctx.t({"code": "common.activated", "msg": "Activated"}) 
													: 
													ctx.t({"code": "common.pending", "msg": "Pending"})
												}
											</span>
											<span className="dts-access-management__tooltip-pointer"></span>
										</span>
									</td>

									<td>
										<LangLink
											lang={ctx.lang}
											to={`/settings/access-mgmnt/edit/${item.user.id}`}
											className="link"
										>
											{item.user.firstName} {item.user.lastName}
										</LangLink>
									</td>
									<td>{item.user.email}</td>
									<td>{item.user.organization}</td>
									{/* Updated Role Column with Badge */}
									<td>
										<span>
											{item.role.charAt(0).toUpperCase() + item.role.slice(1)}{" "}
											{/* Capitalizes the first letter */}
										</span>
									</td>
									<td>
										{item.user.updatedAt &&
											format(item.user.updatedAt, "dd-MM-yyyy")}
									</td>
									<td>
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
