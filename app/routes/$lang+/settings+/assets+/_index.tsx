import { useLoaderData } from "react-router";

import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks, Field } from "~/frontend/form";

import { route } from "~/frontend/asset";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { assetLoader } from "~/backend.server/handlers/asset";

import { Filters } from "~/frontend/components/list-page-filters";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs) => {
		return assetLoader({ loaderArgs });
	},
);

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { filters } = ld;
	let { items, pagination } = ld.data;

	return DataScreen({
		ctx,
		title: ctx.t({ code: "assets", msg: "Assets" }),
		baseRoute: route,
		columns: [
			ctx.t({ code: "common.id", msg: "ID" }),
			ctx.t({ code: "common.name", msg: "Name" }),
			ctx.t({ code: "common.sectors", msg: "Sector(s)" }),
			ctx.t({ code: "assets.is_custom", msg: "Is custom" }),
			ctx.t({ code: "common.actions", msg: "Actions" }),
		],
		listName: "assets",
		addNewLabel: ctx.t({
			code: "assets.add_new",
			msg: "Add new asset",
		}),
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		hideLegends: true,
		beforeListElement: (
			<Filters
				ctx={ctx}
				clearFiltersUrl={ctx.url(route)}
				search={filters.search}
				formStartElement={
					<div className="mg-grid mg-grid__col-3">
						<div className="dts-form-component">
							<Field
								label={ctx.t({
									code: "assets.is_custom_question",
									msg: "Is custom?",
								})}
							>
								<select name="builtIn" defaultValue="">
									<option value="">
										{ctx.t({ code: "common.all", msg: "All" })}
									</option>
									<option value="false">
										{ctx.t({ code: "assets.custom", msg: "Custom" })}
									</option>
									<option value="true">
										{ctx.t({ code: "assets.built_in", msg: "Built-in" })}
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
						<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>
							{item.id.slice(0, 8)}
						</LangLink>
					</td>
					<td>{item.name}</td>
					<td>{item.sectorNames}</td>
					<td>
						{!item.isBuiltIn
							? ctx.t({ code: "common.yes", msg: "Yes" })
							: ctx.t({ code: "common.no", msg: "No" })}
					</td>
					<td>
						{item.isBuiltIn ? (
							<ActionLinks
								ctx={ctx}
								route={route}
								id={item.id}
								hideEditButton
								hideDeleteButton
							/>
						) : (
							<ActionLinks ctx={ctx} route={route} id={item.id} />
						)}
					</td>
				</tr>
			);
		},
	});
}
