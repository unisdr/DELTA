import { useLoaderData } from "react-router";

import { devExample1Table } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { createPaginatedLoader } from "~/backend.server/handlers/view";

import { desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { LoaderFunctionArgs } from "react-router";
import { route } from "~/frontend/dev_example1";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link"

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";

	if (countryAccountsId) {
		const settings = await getCountrySettingsFromSession(request);
		instanceName = settings.websiteName;
	}

	// Get paginated data
	const paginatedLoader = createPaginatedLoader(async (offsetLimit) => {
		return dr.query.devExample1Table.findMany({
			...offsetLimit,
			columns: { id: true, field1: true },
			where: eq(devExample1Table.countryAccountsId, countryAccountsId),
			orderBy: [desc(devExample1Table.field1)],
		});
	}, await dr.$count(devExample1Table, eq(devExample1Table.countryAccountsId, countryAccountsId)));

	// Call the loader
	const paginatedData = await paginatedLoader(args);

	// Return both
	return {
		instanceName,
		...paginatedData,
	};
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const { items, pagination } = ld.data;

	return DataScreen({
		ctx,
		title: ctx.t({
			"code": "dev_examples",
			"msg": "Dev examples"
		}),
		addNewLabel: ctx.t({
			"code": "dev_examples.add_new",
			"msg": "Add new dev example"
		}),
		baseRoute: route,
		columns: [
			ctx.t({ "code": "common.id", "msg": "ID" }),
			ctx.t({ "code": "dev_examples.field1", "msg": "Field 1" }),
			ctx.t({ "code": "common.actions", "msg": "Actions" })
		],
		listName: "dev-examples",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>{item.id}</LangLink>
				</td>
				<td>{item.field1}</td>
				<td>
					<ActionLinks ctx={ctx} route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
