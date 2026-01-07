
import {
	useLoaderData,
} from "@remix-run/react";

import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form"

import {
	route
} from "~/frontend/organization";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { organizationLoader } from "~/backend.server/handlers/organization";

import { Filters } from "~/frontend/components/list-page-filters";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";

import { urlLang } from "~/util/url";
import { NavSettings } from "~/routes/$lang+/settings/nav";

export const loader = authLoaderPublicOrWithPerm("ManageOrganizations", async (loaderArgs) => {
	return organizationLoader({ loaderArgs })
})



export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { filters } = ld;
	let { items, pagination } = ld.data;

	const navSettings = <NavSettings ctx={ctx} userRole={ld.common.user?.role} />;

	return DataScreen({
		ctx,
		title: ctx.t({ "code": "organizations", "msg": "Organizations" }),
		addNewLabel: ctx.t({ "code": "organizations.add_new", "msg": "Add new organization" }),
		baseRoute: route,
		columns: [
			ctx.t({ "code": "common.id", "msg": "ID" }),
			ctx.t({ "code": "common.name", "msg": "Name" }),
			ctx.t({ "code": "common.actions", "msg": "Actions" })
		],
		listName: "organizations",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		MainContainer__headerExtra: navSettings,
		beforeListElement: <Filters
			ctx={ctx}
			clearFiltersUrl={urlLang(ctx.lang, route)}
			search={filters.search}
			formStartElement={
				<>

				</>
			}

		/>,
		hideLegends: true,
		renderRow: (item, route) => {
			return (
				<tr key={item.id}>
					<td>
						<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>{item.id.slice(0, 8)}</LangLink>
					</td>
					<td>{item.name}</td>
					<td className="dts-table__actions">
						<ActionLinks ctx={ctx} route={route} id={item.id} user={ld.common.user} />
					</td>
				</tr>
			)
		}
	});
}

