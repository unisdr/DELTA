import { useLoaderData } from "react-router";

import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks, Field } from "~/frontend/form";

import { route } from "~/frontend/asset";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { assetLoader } from "~/backend.server/handlers/asset";

import { Filters } from "~/frontend/components/list-page-filters";


import { LangLink } from "~/utils/link";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return assetLoader({ loaderArgs });
	},
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();

	const { filters } = ld;
	let { items, pagination } = ld.data;

	return DataScreen({
		title: "Assets",
		baseRoute: route,
		columns: [
			"ID",
			"Name",
			"Sector(s)",
			"Is custom",
			"Actions",
		],
		listName: "assets",
		addNewLabel: "Add new asset",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		hideLegends: true,
		beforeListElement: (
			<Filters
				clearFiltersUrl={route}
				search={filters.search}
				formStartElement={
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component">
							<Field
								label={"Is custom?"}
							>
								<select name="builtIn" defaultValue="">
									<option value="">
										{"All"}
									</option>
									<option value="false">
										{"Custom"}
									</option>
									<option value="true">
										{"Built-in"}
									</option>
								</select>
							</Field>
						</div>
					</div>
				}
			/>
		),
		renderRow: (item, route) => {
			return (
				<tr key={item.id}>
					<td>
						<LangLink lang="en" to={`${route}/${item.id}`}>
							{item.id.slice(0, 8)}
						</LangLink>
					</td>
					<td>{item.name}</td>
					<td>{item.sectorNames}</td>
					<td>
						{!item.isBuiltIn
							? "Yes"
							: "No"}
					</td>
					<td>
						{item.isBuiltIn ? (
							<ActionLinks
								route={route}
								id={item.id}
								hideEditButton
								hideDeleteButton
							/>
						) : (
							<ActionLinks route={route} id={item.id} />
						)}
					</td>
				</tr>
			);
		},
	});
}
