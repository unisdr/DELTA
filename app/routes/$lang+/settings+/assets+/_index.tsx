import {
	useLoaderData,
} from "@remix-run/react";

import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks, Field} from "~/frontend/form"

import {
	route
} from "~/frontend/asset";
import {authLoaderPublicOrWithPerm} from "~/util/auth";
import {assetLoader} from "~/backend.server/handlers/asset";

import {Filters} from "~/frontend/components/list-page-filters";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/util/link";

export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return assetLoader({loaderArgs})
})

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const {filters} = ld;
	let {items, pagination} = ld.data;

	return DataScreen({
		ctx,
		plural: "Assets",
		resourceName: "Asset",
		baseRoute: route,
		columns: [
			"ID",
			"Name",
			"Sector(s)",
			"Is Custom",
			"Actions"
		],
		listName: "assets",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		hideLegends: true,
		beforeListElement: <Filters
			clearFiltersUrl={route}
			search={filters.search}
			formStartElement={
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-form-component">
						<Field label="Is Custom?">
							<select name="builtIn" defaultValue="">
								<option value="">All</option>
								<option value="false">Custom</option>
								<option value="true">Built-in</option>
							</select>
						</Field>
					</div>
				</div>
			}
		/>,
		renderRow: (item, route) => {
			return (
				<tr key={item.id}>
					<td>
						<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>{item.id.slice(0, 8)}</LangLink>
					</td>
					<td>{item.name}</td>
					<td>
						{item.sectorNames}
					</td>
					<td>{!item.isBuiltIn ? "Yes" : "No"}</td>
					<td>
						{item.isBuiltIn ? (
							<ActionLinks ctx={ctx} route={route} id={item.id} hideEditButton hideDeleteButton />
						) : (
							<ActionLinks ctx={ctx} route={route} id={item.id} />
						)}
					</td>
				</tr>
			)
		}
	});
}
