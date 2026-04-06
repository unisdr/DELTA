import { useLoaderData } from "react-router";

import { lossesTable } from "~/drizzle/schema/lossesTable";

import { dr } from "~/db.server";

import { sql, and, desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { route2 } from "~/frontend/losses";
import { authLoaderWithPerm } from "~/utils/auth";
import {


	executeQueryForPagination3,
	OffsetLimit,
} from "~/frontend/pagination/api.server";
import { getSectorFullPathById } from "~/backend.server/models/sector";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/utils/session";


import { LangLink } from "~/utils/link";

import { sectorTable } from "~/drizzle/schema/sectorTable";

const ctx: any = { t: (message: any, _v?: any) => message?.msg ?? "", lang: "en", url: (p: string) => p, fullUrl: (p: string) => p, rootUrl: () => "/" };


export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {


	let { params, request } = loaderArgs;
	let recordId = params.disRecId;
	if (!recordId) {
		throw new Error("Route does not have disRecId param");
	}
	let url = new URL(request.url);
	let sectorId = url.searchParams.get("sectorId") || "";
	if (!sectorId) {
		console.log("sectorId was not provided in the url");
		throw new Response("Not Found", { status: 404 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "DELTA Resilience";
	if (countryAccountsId) {
		const settigns = await getCountrySettingsFromSession(request);
		instanceName = settigns.websiteName;
	}
	let dataFetcher = async (offsetLimit: OffsetLimit) => {
		return dr.query.lossesTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				recordId: true,
				sectorId: true,
			},
			with: {
				sector: {
					columns: { id: true },
					extras: {
						name: sql<string>`dts_jsonb_localized(${sectorTable.name}, ${ctx.lang})`.as(
							"name",
						),
					},
				},
			},
			where: and(
				eq(lossesTable.sectorId, sectorId),
				eq(lossesTable.recordId, recordId),
			),
			orderBy: [desc(lossesTable.id)],
		});
	};

	let countFetcher = async () => {
		return dr.$count(
			lossesTable,
			and(
				eq(lossesTable.sectorId, sectorId),
				eq(lossesTable.recordId, recordId),
			),
		);
	};

	const count = await countFetcher();

	const res = await executeQueryForPagination3(request, count, dataFetcher, [
		"sectorId",
	]);

	const sectorFullPath = (await getSectorFullPathById(sectorId)) as string;

	return {
		data: res,
		recordId,
		sectorId,
		sectorFullPath,
		instanceName,
	};
});

export default function Data() {
	const ld = useLoaderData<typeof loader>();


	const { items, pagination } = ld.data;

	return DataScreen({
		headerElement: (
			<LangLink lang="en" to={"/disaster-record/edit/" + ld.recordId}>
				{"Back to disaster record"}
			</LangLink>
		),
		title: "Losses: Sector effects: {sectorFullPath}",
		addNewLabel: "Add new losses",
		baseRoute: route2(ld.recordId),
		searchParams: new URLSearchParams([["sectorId", String(ld.sectorId)]]),
		columns: [
			"ID",
			"Disaster record ID",
			"Sector",
			"Actions",
		],
		listName: "losses",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: false,
		hideLegends: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<LangLink lang="en" to={`${route}/${item.id}`}>
						{item.id.slice(0, 8)}
					</LangLink>
				</td>
				<td>{item.recordId.slice(0, 8)}</td>
				<td>{item.sector.name}</td>
				<td className="dts-table__actions">
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
