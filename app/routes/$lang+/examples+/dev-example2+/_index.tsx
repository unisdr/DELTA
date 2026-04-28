import { useLoaderData } from "react-router";

import { devExample2Table } from "~/drizzle/schema/devExample2Table";

import { dr } from "~/db.server";

import { createPaginatedLoader } from "~/backend.server/handlers/view";

import { desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { LoaderFunctionArgs } from "react-router";
import { route } from "~/frontend/dev_example2";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";
import { ViewContext } from "~/frontend/context";

import { LangLink } from "~/utils/link";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";

	if (countryAccountsId) {
		const settings = await getCountrySettingsFromSession(request);
		instanceName = settings.websiteName;
	}

	const paginatedLoader = createPaginatedLoader(
		async (offsetLimit) => {
			return dr.query.devExample2Table.findMany({
				...offsetLimit,
				columns: { id: true, field1: true },
				where: eq(devExample2Table.countryAccountsId, countryAccountsId),
				orderBy: [desc(devExample2Table.field1)],
			});
		},
		await dr.$count(
			devExample2Table,
			eq(devExample2Table.countryAccountsId, countryAccountsId),
		),
	);

	const paginatedData = await paginatedLoader(args);

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
			code: "dev_examples2",
			msg: "Dev examples 2",
		}),
		addNewLabel: ctx.t({
			code: "dev_examples2.add_new",
			msg: "Add new dev example 2",
		}),
		baseRoute: route,
		columns: [
			ctx.t({ code: "common.id", msg: "ID" }),
			ctx.t({ code: "dev_examples2.field1", msg: "Field 1" }),
			ctx.t({ code: "common.actions", msg: "Actions" }),
		],
		listName: "dev-examples2",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<LangLink lang={ctx.lang} to={`${route}/${item.id}`}>
						{item.id}
					</LangLink>
				</td>
				<td>{item.field1}</td>
				<td>
					<ActionLinks ctx={ctx} route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
